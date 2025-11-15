/**
 * Cloudflare R2 Storage Adapter
 *
 * Implements StorageAdapter interface for Cloudflare R2.
 * Used for scaling beyond 1,000 users.
 *
 * Features:
 * - 10GB free storage
 * - 1M free PUT requests/month
 * - 10M free GET requests/month
 * - ZERO egress fees (unlimited bandwidth)
 * - Direct browser upload (no backend involved)
 * - Scales to millions of users
 *
 * Migration: Just change VITE_STORAGE_PROVIDER=r2 in .env
 */

import type {
  StorageAdapter,
  StoragePath,
  UploadProgress,
  UploadResult,
} from '../types';

/**
 * Cloudflare R2 Storage Adapter Implementation
 *
 * Note: This adapter uses presigned URLs for direct browser-to-R2 uploads.
 * Your backend needs to provide an API endpoint to generate presigned URLs.
 */
export class R2StorageAdapter implements StorageAdapter {
  private accountId: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    this.accountId = import.meta.env.VITE_R2_ACCOUNT_ID || '';
    this.accessKeyId = import.meta.env.VITE_R2_ACCESS_KEY_ID || '';
    this.secretAccessKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '';
    this.bucketName = import.meta.env.VITE_R2_BUCKET_NAME || '';
    this.publicUrl = import.meta.env.VITE_R2_PUBLIC_URL || '';
  }

  /**
   * Check if R2 is properly configured
   */
  isConfigured(): boolean {
    return Boolean(
      this.accountId &&
      this.accessKeyId &&
      this.secretAccessKey &&
      this.bucketName &&
      this.publicUrl
    );
  }

  /**
   * Upload file to Cloudflare R2
   *
   * Flow:
   * 1. Request presigned URL from backend
   * 2. Upload directly to R2 from browser
   * 3. Return public URL
   *
   * @param file - File to upload
   * @param storagePath - Storage path (categories, items, or store-logos)
   * @param subPath - Subpath within storage path (e.g., 'store_123/img_456.jpg')
   * @param onProgress - Progress callback
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
          error: 'Cloudflare R2 is not configured. Check environment variables.',
        };
      }

      const fileName = file.name;
      // Construct full path: storagePath/subPath/fileName
      const fullPath = `${storagePath}/${subPath}/${fileName}`;

      // Step 1: Get presigned URL from your backend
      // TODO: Replace with your actual backend endpoint
      const presignedUrl = await this.getPresignedUploadUrl(fullPath, file.type);

      if (!presignedUrl) {
        return {
          success: false,
          error: 'Failed to get upload URL from server',
          fileName,
        };
      }

      // Step 2: Upload directly to R2
      const xhr = new XMLHttpRequest();

      // Track progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress({
              loaded: e.loaded,
              total: e.total,
              percentage: Math.round((e.loaded / e.total) * 100),
            });
          }
        });
      }

      // Upload file
      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // Step 3: Construct public URL
      const publicUrl = `${this.publicUrl}/${fullPath}`;

      console.log(`[R2Adapter] Uploaded: ${fileName} → ${publicUrl}`);

      return {
        success: true,
        url: publicUrl,
        fileName,
      };
    } catch (error) {
      console.error('[R2Adapter] Upload error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload to R2',
        fileName: file.name,
      };
    }
  }

  /**
   * Delete file from R2
   *
   * @param storagePath - Storage path (categories, items, or store-logos)
   * @param subPath - Subpath to file to delete
   * @returns Success status
   */
  async deleteFile(storagePath: StoragePath, subPath: string): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        console.error('[R2Adapter] Storage not configured');
        return false;
      }

      // Construct full path
      const fullPath = `${storagePath}/${subPath}`;

      // Get presigned DELETE URL from backend
      const presignedUrl = await this.getPresignedDeleteUrl(fullPath);

      if (!presignedUrl) {
        return false;
      }

      const response = await fetch(presignedUrl, { method: 'DELETE' });

      if (!response.ok) {
        console.error('[R2Adapter] Delete failed:', response.statusText);
        return false;
      }

      console.log(`[R2Adapter] Deleted: ${fullPath}`);
      return true;
    } catch (error) {
      console.error('[R2Adapter] Delete error:', error);
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
      console.warn('[R2Adapter] Storage not configured');
      return '';
    }

    // Construct full path
    const fullPath = `${storagePath}/${subPath}`;
    return `${this.publicUrl}/${fullPath}`;
  }

  /**
   * Get presigned upload URL from backend
   *
   * @param path - File path
   * @param contentType - File MIME type
   * @returns Presigned URL
   */
  private async getPresignedUploadUrl(
    path: string,
    contentType: string
  ): Promise<string | null> {
    try {
      // TODO: Replace with your actual backend endpoint
      const response = await fetch('/api/storage/get-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, contentType }),
      });

      if (!response.ok) {
        throw new Error('Failed to get presigned URL');
      }

      const data = await response.json();
      return data.uploadUrl;
    } catch (error) {
      console.error('[R2Adapter] Failed to get presigned URL:', error);
      return null;
    }
  }

  /**
   * Get presigned delete URL from backend
   *
   * @param path - File path
   * @returns Presigned URL
   */
  private async getPresignedDeleteUrl(path: string): Promise<string | null> {
    try {
      // TODO: Replace with your actual backend endpoint
      const response = await fetch('/api/storage/get-delete-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        throw new Error('Failed to get delete URL');
      }

      const data = await response.json();
      return data.deleteUrl;
    } catch (error) {
      console.error('[R2Adapter] Failed to get delete URL:', error);
      return null;
    }
  }
}

/**
 * Backend Implementation Guide for R2
 *
 * You need to create these API endpoints in your backend:
 *
 * 1. POST /api/storage/get-upload-url
 *    - Generates presigned URL for uploading
 *    - Returns: { uploadUrl: string, publicUrl: string }
 *
 * 2. POST /api/storage/get-delete-url
 *    - Generates presigned URL for deleting
 *    - Returns: { deleteUrl: string }
 *
 * Example implementation (Node.js):
 *
 * ```typescript
 * import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
 * import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
 *
 * const s3 = new S3Client({
 *   region: 'auto',
 *   endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
 *   credentials: {
 *     accessKeyId: process.env.R2_ACCESS_KEY_ID,
 *     secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
 *   },
 * });
 *
 * app.post('/api/storage/get-upload-url', async (req, res) => {
 *   const { path, contentType } = req.body;
 *
 *   const command = new PutObjectCommand({
 *     Bucket: process.env.R2_BUCKET_NAME,
 *     Key: path,
 *     ContentType: contentType,
 *   });
 *
 *   const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
 *   const publicUrl = `${process.env.R2_PUBLIC_URL}/${path}`;
 *
 *   res.json({ uploadUrl, publicUrl });
 * });
 * ```
 */
