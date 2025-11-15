/**
 * Supabase Storage Adapter
 *
 * Implements StorageAdapter interface for Supabase Storage.
 * Used as the default (FREE) storage provider for startups.
 *
 * Features:
 * - 1GB free storage on Supabase free tier
 * - Unlimited upload/download requests
 * - CDN caching included
 * - Perfect for 0-1,000 users
 */

import { supabase } from '../../supabaseClient';
import type {
  StorageAdapter,
  StorageBucket,
  UploadProgress,
  UploadResult,
} from '../types';

/**
 * Supabase Storage Adapter Implementation
 */
export class SupabaseStorageAdapter implements StorageAdapter {
  /**
   * Check if Supabase is properly configured
   */
  isConfigured(): boolean {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    return Boolean(url && key);
  }

  /**
   * Upload file to Supabase Storage
   *
   * @param file - File to upload
   * @param bucket - Storage bucket
   * @param path - Path within bucket
   * @param onProgress - Progress callback (note: Supabase doesn't provide progress)
   * @returns Upload result
   */
  async uploadFile(
    file: File,
    bucket: StorageBucket,
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Supabase Storage is not configured. Check environment variables.',
        };
      }

      // Note: Supabase Storage doesn't provide upload progress
      // We can only report 0% and 100%
      if (onProgress) {
        onProgress({ loaded: 0, total: file.size, percentage: 0 });
      }

      const fileName = file.name;
      const filePath = `${path}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600', // Cache for 1 hour
          upsert: false, // Don't overwrite existing files
        });

      if (error) {
        console.error('[SupabaseAdapter] Upload error:', error);

        // Handle specific error cases
        if (error.message.includes('already exists')) {
          return {
            success: false,
            error: 'File already exists. Please rename and try again.',
            fileName,
          };
        }

        return {
          success: false,
          error: error.message || 'Failed to upload file',
          fileName,
        };
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      if (onProgress) {
        onProgress({ loaded: file.size, total: file.size, percentage: 100 });
      }

      console.log(`[SupabaseAdapter] Uploaded: ${fileName} → ${publicUrl}`);

      return {
        success: true,
        url: publicUrl,
        fileName,
      };
    } catch (error) {
      console.error('[SupabaseAdapter] Unexpected error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error during upload',
        fileName: file.name,
      };
    }
  }

  /**
   * Delete file from Supabase Storage
   *
   * @param bucket - Storage bucket
   * @param path - Path to file
   * @returns Success status
   */
  async deleteFile(bucket: StorageBucket, path: string): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        console.error('[SupabaseAdapter] Storage not configured');
        return false;
      }

      const { error } = await supabase.storage.from(bucket).remove([path]);

      if (error) {
        console.error('[SupabaseAdapter] Delete error:', error);
        return false;
      }

      console.log(`[SupabaseAdapter] Deleted: ${path}`);
      return true;
    } catch (error) {
      console.error('[SupabaseAdapter] Unexpected delete error:', error);
      return false;
    }
  }

  /**
   * Get public URL for a file
   *
   * @param bucket - Storage bucket
   * @param path - Path to file
   * @returns Public URL
   */
  getPublicUrl(bucket: StorageBucket, path: string): string {
    if (!this.isConfigured()) {
      console.warn('[SupabaseAdapter] Storage not configured');
      return '';
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);

    return publicUrl;
  }

  /**
   * Check if a file exists
   *
   * @param bucket - Storage bucket
   * @param path - Path to file
   * @returns True if file exists
   */
  async fileExists(bucket: StorageBucket, path: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage.from(bucket).list(path.split('/').slice(0, -1).join('/'));

      if (error) {
        return false;
      }

      const fileName = path.split('/').pop();
      return data?.some((file) => file.name === fileName) || false;
    } catch {
      return false;
    }
  }
}
