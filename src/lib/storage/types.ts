/**
 * Storage Abstraction Layer - Type Definitions
 *
 * Provides a provider-agnostic interface for image storage.
 * Enables seamless migration between storage providers (Supabase, R2, S3, etc.)
 * with zero code changes - just environment variable configuration.
 */

/**
 * Supported storage providers
 */
export type StorageProvider = 'supabase' | 'r2' | 's3';

/**
 * Storage bucket name
 * Using single bucket 'store-assets' with subpaths for organization
 */
export const STORAGE_BUCKET = 'store-assets' as const;

/**
 * Storage paths within bucket for different image types
 */
export const STORAGE_PATHS = {
  CATEGORIES: 'categories',
  ITEMS: 'items',
  STORES: 'store-logos',
} as const;

export type StoragePath = typeof STORAGE_PATHS[keyof typeof STORAGE_PATHS];

/**
 * Upload progress callback
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload result for single file
 */
export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
}

/**
 * Batch upload result
 */
export interface BatchUploadResult {
  successful: Array<{ fileName: string; url: string }>;
  failed: Array<{ fileName: string; error: string }>;
  totalUploaded: number;
  totalFailed: number;
}

/**
 * Storage adapter interface
 * All storage providers must implement this interface
 */
export interface StorageAdapter {
  /**
   * Upload a single file to storage
   *
   * @param file - File to upload
   * @param storagePath - Storage path (categories, items, or store-logos)
   * @param subPath - Subpath within storage path (e.g., 'store_123/img_456.jpg')
   * @param onProgress - Optional progress callback
   * @returns Upload result with URL or error
   */
  uploadFile(
    file: File,
    storagePath: StoragePath,
    subPath: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult>;

  /**
   * Delete a file from storage
   *
   * @param storagePath - Storage path (categories, items, or store-logos)
   * @param subPath - Subpath to file to delete
   * @returns Success status
   */
  deleteFile(storagePath: StoragePath, subPath: string): Promise<boolean>;

  /**
   * Get public URL for a file
   *
   * @param storagePath - Storage path (categories, items, or store-logos)
   * @param subPath - Subpath to file
   * @returns Public URL
   */
  getPublicUrl(storagePath: StoragePath, subPath: string): string;

  /**
   * Check if provider is properly configured
   *
   * @returns True if provider is ready to use
   */
  isConfigured(): boolean;
}

/**
 * Image validation constraints
 */
export interface ImageValidationRules {
  /**
   * Maximum file size in bytes
   * Default: 1MB (1024 * 1024)
   */
  maxSizeBytes: number;

  /**
   * Allowed MIME types
   * Default: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
   */
  allowedTypes: string[];

  /**
   * Maximum dimensions (optional)
   */
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Image compression options
 */
export interface ImageCompressionOptions {
  /**
   * Target file size in MB
   * Default: 0.25 (250KB)
   */
  maxSizeMB: number;

  /**
   * Maximum width or height
   * Default: 1920
   */
  maxWidthOrHeight: number;

  /**
   * Initial quality (0-1)
   * Default: 0.8
   */
  initialQuality: number;

  /**
   * Use web worker for compression (non-blocking)
   * Default: true
   */
  useWebWorker: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  provider: StorageProvider;
  supabase?: {
    url: string;
    anonKey: string;
  };
  r2?: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicUrl: string;
  };
  s3?: {
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}
