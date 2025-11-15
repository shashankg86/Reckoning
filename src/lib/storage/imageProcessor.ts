/**
 * Image Processor
 *
 * Handles image validation and compression before upload.
 * Ensures all images meet size and quality requirements.
 */

import imageCompression from 'browser-image-compression';
import type {
  ImageValidationRules,
  ImageCompressionOptions,
  ValidationResult,
} from './types';

/**
 * Default validation rules
 * - Max 1MB input file size
 * - Only JPEG, PNG, WebP allowed
 */
const DEFAULT_VALIDATION_RULES: ImageValidationRules = {
  maxSizeBytes: 1024 * 1024, // 1MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};

/**
 * Default compression options with WebP conversion
 * - Target 80KB output (WebP format)
 * - Max 1024px dimension (perfect for thumbnails/retina displays)
 * - 80% quality (excellent for WebP)
 * - Converts JPEG/PNG → WebP automatically (25-35% better compression)
 */
const DEFAULT_COMPRESSION_OPTIONS: ImageCompressionOptions = {
  maxSizeMB: 0.08, // 80KB target (3x smaller than before!)
  maxWidthOrHeight: 1024, // Perfect for thumbnails
  initialQuality: 0.8, // Excellent quality for WebP
  useWebWorker: true,
  fileType: 'image/webp', // Auto-convert to WebP
};

/**
 * Aggressive compression options (fallback if first pass too large)
 * - Target 60KB output (WebP format)
 * - Max 800px dimension
 * - 75% quality (still good for WebP)
 */
const AGGRESSIVE_COMPRESSION_OPTIONS: ImageCompressionOptions = {
  maxSizeMB: 0.06, // 60KB hard limit
  maxWidthOrHeight: 800,
  initialQuality: 0.75,
  useWebWorker: true,
  fileType: 'image/webp', // Auto-convert to WebP
};

/**
 * Image Processor Class
 */
export class ImageProcessor {
  /**
   * Validate file against rules
   *
   * @param file - File to validate
   * @param rules - Validation rules (optional, uses defaults)
   * @returns Validation result
   */
  static validateFile(
    file: File,
    rules: Partial<ImageValidationRules> = {}
  ): ValidationResult {
    const validationRules = { ...DEFAULT_VALIDATION_RULES, ...rules };

    // Check file type
    if (!validationRules.allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `Invalid file type. Allowed: ${validationRules.allowedTypes.join(', ')}`,
      };
    }

    // Check file size
    if (file.size > validationRules.maxSizeBytes) {
      const maxSizeMB = (validationRules.maxSizeBytes / (1024 * 1024)).toFixed(1);
      return {
        isValid: false,
        error: `File too large. Maximum size: ${maxSizeMB}MB`,
      };
    }

    return { isValid: true };
  }

  /**
   * Compress image file
   *
   * Two-pass compression:
   * 1. Try with default quality (80%)
   * 2. If still too large, compress more aggressively (70%)
   *
   * @param file - File to compress
   * @param options - Compression options (optional, uses defaults)
   * @returns Compressed file
   */
  static async compressImage(
    file: File,
    options: Partial<ImageCompressionOptions> = {}
  ): Promise<File> {
    const compressionOptions = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };

    try {
      // First pass: High quality compression
      let compressedFile = await imageCompression(file, compressionOptions);

      // Check if we met target size
      const targetBytes = compressionOptions.maxSizeMB * 1024 * 1024;

      if (compressedFile.size > targetBytes) {
        // Second pass: More aggressive compression
        console.warn(
          `[ImageProcessor] First pass ${(compressedFile.size / 1024).toFixed(0)}KB > target ${(targetBytes / 1024).toFixed(0)}KB. Applying aggressive compression...`
        );

        compressedFile = await imageCompression(
          file,
          AGGRESSIVE_COMPRESSION_OPTIONS
        );
      }

      // Log compression stats
      const originalKB = (file.size / 1024).toFixed(0);
      const compressedKB = (compressedFile.size / 1024).toFixed(0);
      const ratio = ((1 - compressedFile.size / file.size) * 100).toFixed(0);

      console.log(
        `[ImageProcessor] Compressed: ${originalKB}KB → ${compressedKB}KB (${ratio}% reduction)`
      );

      return compressedFile;
    } catch (error) {
      console.error('[ImageProcessor] Compression error:', error);
      throw new Error('Failed to compress image');
    }
  }

  /**
   * Process image for upload
   *
   * Combined validation + compression pipeline
   *
   * @param file - File to process
   * @param validationRules - Validation rules (optional)
   * @param compressionOptions - Compression options (optional)
   * @returns Processed file ready for upload
   * @throws Error if validation fails or compression error
   */
  static async processForUpload(
    file: File,
    validationRules?: Partial<ImageValidationRules>,
    compressionOptions?: Partial<ImageCompressionOptions>
  ): Promise<File> {
    // Step 1: Validate
    const validation = this.validateFile(file, validationRules);

    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Step 2: Compress
    const compressedFile = await this.compressImage(file, compressionOptions);

    return compressedFile;
  }

  /**
   * Get file extension from File object
   *
   * @param file - File object
   * @returns Extension (e.g., 'jpg', 'png')
   */
  static getFileExtension(file: File): string {
    const parts = file.name.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Generate unique filename
   *
   * @param prefix - Prefix for filename (e.g., 'category', 'item')
   * @param extension - File extension
   * @returns Unique filename
   */
  static generateUniqueFileName(prefix: string, extension: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${timestamp}_${random}.${extension}`;
  }

  /**
   * Format file size for display
   *
   * @param bytes - File size in bytes
   * @returns Formatted string (e.g., '1.2 MB')
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
}
