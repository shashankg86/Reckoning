import { supabase } from '../lib/supabaseClient';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Storage API for handling file uploads to Supabase Storage
 */
export const storageAPI = {
  /**
   * Upload an image file to Supabase Storage
   * @param file - The file to upload
   * @param bucket - The storage bucket name (default: 'store-assets')
   * @param folder - Optional folder path within the bucket
   * @returns Object containing the public URL and storage path
   */
  async uploadImage(
    file: File,
    bucket: string = 'store-assets',
    folder?: string
  ): Promise<UploadResult> {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      // Generate unique filename with timestamp to avoid collisions
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const sanitizedName = file.name
        .replace(/\.[^/.]+$/, '') // Remove extension
        .replace(/[^a-z0-9-_]/gi, '-') // Replace special chars
        .toLowerCase()
        .substring(0, 50); // Limit length

      const fileName = `${sanitizedName}-${timestamp}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(error.message || 'Failed to upload file');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        url: publicUrl,
        path: data.path,
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      throw new Error(error.message || 'Failed to upload image');
    }
  },

  /**
   * Delete a file from Supabase Storage
   * @param path - The file path in storage
   * @param bucket - The storage bucket name (default: 'store-assets')
   */
  async deleteFile(path: string, bucket: string = 'store-assets'): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Storage delete error:', error);
        throw new Error(error.message || 'Failed to delete file');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      throw new Error(error.message || 'Failed to delete file');
    }
  },

  /**
   * Upload a store logo
   * @param file - The logo file to upload
   * @param storeId - Optional store ID to organize files
   * @returns Object containing the public URL and storage path
   */
  async uploadStoreLogo(file: File, storeId?: string): Promise<UploadResult> {
    const folder = storeId ? `logos/${storeId}` : 'logos';
    return this.uploadImage(file, 'store-assets', folder);
  },

  /**
   * Check if storage bucket exists and is accessible
   * @param bucket - The storage bucket name
   * @returns True if bucket is accessible
   */
  async checkBucket(bucket: string = 'store-assets'): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list('', { limit: 1 });

      return !error;
    } catch (error) {
      return false;
    }
  },
};
