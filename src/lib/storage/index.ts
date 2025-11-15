/**
 * Universal Storage Service
 *
 * Provider-agnostic image storage service.
 * Switch between providers (Supabase, R2, S3) by changing one environment variable.
 *
 * Usage:
 * ```typescript
 * import { storageService } from '@/lib/storage';
 *
 * // Upload image
 * const result = await storageService.uploadImage(
 *   file,
 *   STORAGE_BUCKETS.CATEGORIES,
 *   `store_${storeId}`
 * );
 *
 * if (result.success) {
 *   const imageUrl = result.url;
 * }
 * ```
 *
 * Migration:
 * 1. Day 1: VITE_STORAGE_PROVIDER=supabase (FREE, 1GB)
 * 2. Day 1000: VITE_STORAGE_PROVIDER=r2 (when scaling)
 */

import { SupabaseStorageAdapter } from './adapters/supabaseAdapter';
import { R2StorageAdapter } from './adapters/r2Adapter';
import { ImageProcessor } from './imageProcessor';
import { ProgressiveImageUploader } from './progressiveUploader';
import type {
  StorageProvider,
  StorageAdapter,
  StorageBucket,
  UploadResult,
  BatchUploadResult,
  UploadProgress,
} from './types';

// Re-export types and constants
export * from './types';
export { ImageProcessor } from './imageProcessor';
export { ProgressiveImageUploader } from './progressiveUploader';

/**
 * Storage Service Factory
 *
 * Creates appropriate storage adapter based on environment configuration
 */
class UniversalStorageService {
  private adapter: StorageAdapter;
  private provider: StorageProvider;

  constructor() {
    // Auto-detect provider from environment
    this.provider = (import.meta.env.VITE_STORAGE_PROVIDER as StorageProvider) || 'supabase';

    // Create appropriate adapter
    switch (this.provider) {
      case 'r2':
        this.adapter = new R2StorageAdapter();
        console.log('[StorageService] Using Cloudflare R2 adapter');
        break;

      case 'supabase':
      default:
        this.adapter = new SupabaseStorageAdapter();
        console.log('[StorageService] Using Supabase Storage adapter');
        break;
    }

    // Verify configuration
    if (!this.adapter.isConfigured()) {
      console.warn(
        `[StorageService] ${this.provider} is not properly configured. Check environment variables.`
      );
    }
  }

  /**
   * Get current storage provider
   */
  getProvider(): StorageProvider {
    return this.provider;
  }

  /**
   * Check if storage is configured
   */
  isConfigured(): boolean {
    return this.adapter.isConfigured();
  }

  /**
   * Upload single image
   *
   * Handles validation, compression, and upload automatically
   *
   * @param file - Image file
   * @param bucket - Storage bucket
   * @param path - Path within bucket
   * @param onProgress - Progress callback (optional)
   * @returns Upload result
   */
  async uploadImage(
    file: File,
    bucket: StorageBucket,
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Step 1: Validate and compress
      const processedFile = await ImageProcessor.processForUpload(file);

      // Step 2: Generate unique filename
      const extension = ImageProcessor.getFileExtension(processedFile);
      const fileName = ImageProcessor.generateUniqueFileName('img', extension);

      // Create new File with unique name
      const renamedFile = new File([processedFile], fileName, {
        type: processedFile.type,
      });

      // Step 3: Upload
      const result = await this.adapter.uploadFile(
        renamedFile,
        bucket,
        path,
        onProgress
      );

      return result;
    } catch (error) {
      console.error('[StorageService] Upload error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload image',
        fileName: file.name,
      };
    }
  }

  /**
   * Batch upload multiple images
   *
   * Uploads images in parallel with concurrency control
   *
   * @param files - Array of image files
   * @param bucket - Storage bucket
   * @param path - Path within bucket
   * @param concurrentLimit - Max parallel uploads (default: 10)
   * @param onProgress - Progress callback (completed, total)
   * @returns Batch upload result
   */
  async batchUploadImages(
    files: File[],
    bucket: StorageBucket,
    path: string,
    concurrentLimit = 10,
    onProgress?: (completed: number, total: number) => void
  ): Promise<BatchUploadResult> {
    const successful: Array<{ fileName: string; url: string }> = [];
    const failed: Array<{ fileName: string; error: string }> = [];

    // Process in batches
    const batches: File[][] = [];
    for (let i = 0; i < files.length; i += concurrentLimit) {
      batches.push(files.slice(i, i + concurrentLimit));
    }

    let completed = 0;

    for (const batch of batches) {
      // Upload batch in parallel
      const results = await Promise.allSettled(
        batch.map((file) => this.uploadImage(file, bucket, path))
      );

      // Collect results
      results.forEach((result, index) => {
        const file = batch[index];
        completed++;

        if (result.status === 'fulfilled' && result.value.success) {
          successful.push({
            fileName: file.name,
            url: result.value.url!,
          });
        } else {
          const error =
            result.status === 'fulfilled'
              ? result.value.error || 'Unknown error'
              : 'Upload failed';

          failed.push({
            fileName: file.name,
            error,
          });
        }

        // Report progress
        if (onProgress) {
          onProgress(completed, files.length);
        }
      });
    }

    return {
      successful,
      failed,
      totalUploaded: successful.length,
      totalFailed: failed.length,
    };
  }

  /**
   * Delete image
   *
   * @param bucket - Storage bucket
   * @param path - Path to file
   * @returns Success status
   */
  async deleteImage(bucket: StorageBucket, path: string): Promise<boolean> {
    try {
      return await this.adapter.deleteFile(bucket, path);
    } catch (error) {
      console.error('[StorageService] Delete error:', error);
      return false;
    }
  }

  /**
   * Get public URL for image
   *
   * @param bucket - Storage bucket
   * @param path - Path to file
   * @returns Public URL
   */
  getPublicUrl(bucket: StorageBucket, path: string): string {
    return this.adapter.getPublicUrl(bucket, path);
  }

  /**
   * Create progressive uploader instance
   *
   * For background uploads while user is filling forms
   *
   * @param concurrentLimit - Max parallel uploads
   * @returns Progressive uploader instance
   */
  createProgressiveUploader(concurrentLimit = 10): ProgressiveImageUploader {
    return new ProgressiveImageUploader(this.adapter, concurrentLimit);
  }
}

/**
 * Singleton instance
 */
export const storageService = new UniversalStorageService();

/**
 * Backward compatibility with old ImageUploadService
 *
 * @deprecated Use storageService instead
 */
export const ImageUploadService = {
  /**
   * @deprecated Use storageService.uploadImage()
   */
  async uploadImage(
    file: File,
    bucket: string,
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    console.warn('[ImageUploadService] Deprecated. Use storageService.uploadImage()');
    return storageService.uploadImage(file, bucket as StorageBucket, path, onProgress);
  },

  /**
   * @deprecated Use storageService.batchUploadImages()
   */
  async batchUploadImages(
    files: File[],
    bucket: string,
    path: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<BatchUploadResult> {
    console.warn('[ImageUploadService] Deprecated. Use storageService.batchUploadImages()');
    return storageService.batchUploadImages(files, bucket as StorageBucket, path, 10, onProgress);
  },
};
