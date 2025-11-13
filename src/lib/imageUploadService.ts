import { supabase } from './supabaseClient';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
}

export interface BatchUploadResult {
  successful: UploadResult[];
  failed: UploadResult[];
  totalUploaded: number;
  totalFailed: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const CONCURRENT_UPLOADS = 5; // Upload 5 images concurrently

export class ImageUploadService {
  /**
   * Validate image file before upload
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Generate unique file name to avoid collisions
   */
  static generateFileName(file: File, prefix?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const extension = file.name.split('.').pop();
    const sanitizedPrefix = prefix ? `${prefix}_` : '';
    return `${sanitizedPrefix}${timestamp}_${random}.${extension}`;
  }

  /**
   * Upload single image to Supabase Storage
   */
  static async uploadImage(
    file: File,
    bucket: string,
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const fileName = this.generateFileName(file);
      const filePath = `${path}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      return {
        success: true,
        url: publicUrl,
        fileName: fileName,
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message || 'Unknown upload error',
      };
    }
  }

  /**
   * Upload multiple images with concurrency control (enterprise-level)
   * Handles hundreds/thousands of uploads efficiently
   */
  static async batchUploadImages(
    files: File[],
    bucket: string,
    path: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<BatchUploadResult> {
    const results: UploadResult[] = [];
    const total = files.length;
    let completed = 0;

    // Process uploads in batches with concurrency control
    for (let i = 0; i < files.length; i += CONCURRENT_UPLOADS) {
      const batch = files.slice(i, i + CONCURRENT_UPLOADS);

      // Upload batch concurrently
      const batchPromises = batch.map((file) => this.uploadImage(file, bucket, path));

      const batchResults = await Promise.allSettled(batchPromises);

      // Process results
      batchResults.forEach((result) => {
        completed++;

        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Upload failed',
          });
        }

        // Report progress
        if (onProgress) {
          onProgress(completed, total);
        }
      });
    }

    // Separate successful and failed uploads
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    return {
      successful,
      failed,
      totalUploaded: successful.length,
      totalFailed: failed.length,
    };
  }

  /**
   * Delete image from Supabase Storage
   */
  static async deleteImage(bucket: string, filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage.from(bucket).remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }

  /**
   * Get file path from public URL
   */
  static getFilePathFromUrl(url: string, bucket: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`);
      return pathParts.length > 1 ? pathParts[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Create optimized preview URL (data URL) for local display before upload
   */
  static createPreviewUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Compress image before upload (optional, for large images)
   */
  static async compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Compression failed'));
              }
            },
            file.type,
            quality
          );
        };

        img.onerror = reject;
      };

      reader.onerror = reject;
    });
  }
}

// Bucket names
export const STORAGE_BUCKETS = {
  CATEGORIES: 'category-images',
  ITEMS: 'item-images',
  STORES: 'store-images',
} as const;
