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
  StoragePath,
  UploadProgress,
  UploadResult,
} from '../types';
import { STORAGE_BUCKET } from '../types';

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
   * @param storagePath - Storage path (categories, items, or store-logos)
   * @param subPath - Subpath within storage path (e.g., 'store_123/img_456.jpg')
   * @param onProgress - Progress callback (note: Supabase doesn't provide progress)
   * @returns Upload result
   */
  async uploadFile(
    file: File,
    storagePath: StoragePath,
    subPath: string,
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
      // Construct full path: storagePath/subPath/fileName
      const filePath = `${storagePath}/${subPath}/${fileName}`;

      // Upload to Supabase Storage (using single bucket)
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
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
      } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

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
   * @param storagePath - Storage path (categories, items, or store-logos)
   * @param subPath - Subpath to file to delete
   * @returns Success status
   */
  async deleteFile(storagePath: StoragePath, subPath: string): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        console.error('[SupabaseAdapter] Storage not configured');
        return false;
      }

      // Construct full path
      const fullPath = `${storagePath}/${subPath}`;

      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([fullPath]);

      if (error) {
        console.error('[SupabaseAdapter] Delete error:', error);
        return false;
      }

      console.log(`[SupabaseAdapter] Deleted: ${fullPath}`);
      return true;
    } catch (error) {
      console.error('[SupabaseAdapter] Unexpected delete error:', error);
      return false;
    }
  }

  /**
   * Get public URL for a file
   *
   * @param storagePath - Storage path (categories, items, or store-logos)
   * @param subPath - Subpath to file
   * @returns Public URL
   */
  getPublicUrl(storagePath: StoragePath, subPath: string): string {
    if (!this.isConfigured()) {
      console.warn('[SupabaseAdapter] Storage not configured');
      return '';
    }

    // Construct full path
    const fullPath = `${storagePath}/${subPath}`;

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fullPath);

    return publicUrl;
  }

  /**
   * Check if a file exists
   *
   * @param storagePath - Storage path (categories, items, or store-logos)
   * @param subPath - Subpath to file
   * @returns True if file exists
   */
  async fileExists(storagePath: StoragePath, subPath: string): Promise<boolean> {
    try {
      // Construct full path
      const fullPath = `${storagePath}/${subPath}`;
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(fullPath.split('/').slice(0, -1).join('/'));

      if (error) {
        return false;
      }

      const fileName = fullPath.split('/').pop();
      return data?.some((file) => file.name === fileName) || false;
    } catch {
      return false;
    }
  }
}
