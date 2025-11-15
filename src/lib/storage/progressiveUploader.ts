/**
 * Progressive Image Uploader
 *
 * Uploads images in the background while user is filling forms.
 * Provides a queue-based system with concurrent upload control.
 *
 * Features:
 * - Background upload (starts immediately, doesn't wait for "Continue")
 * - Concurrent upload control (10-15 parallel uploads)
 * - Progress tracking
 * - Error handling with retry
 * - User doesn't wait for uploads to complete
 */

import { ImageProcessor } from './imageProcessor';
import type { StorageAdapter, StoragePath, UploadResult } from './types';

/**
 * Upload task status
 */
type UploadTaskStatus = 'pending' | 'uploading' | 'completed' | 'failed';

/**
 * Individual upload task
 */
interface UploadTask {
  id: string;
  file: File;
  storagePath: StoragePath;
  subPath: string;
  status: UploadTaskStatus;
  progress: number;
  url?: string;
  error?: string;
  promise?: Promise<UploadResult>;
}

/**
 * Progressive Image Uploader Class
 */
export class ProgressiveImageUploader {
  private adapter: StorageAdapter;
  private queue: Map<string, UploadTask>;
  private concurrentLimit: number;
  private currentlyUploading: number;

  /**
   * Constructor
   *
   * @param adapter - Storage adapter to use
   * @param concurrentLimit - Max concurrent uploads (default: 20 for 2x speed)
   */
  constructor(adapter: StorageAdapter, concurrentLimit = 20) {
    this.adapter = adapter;
    this.queue = new Map();
    this.concurrentLimit = concurrentLimit;
    this.currentlyUploading = 0;
  }

  /**
   * Add file to upload queue
   *
   * Starts uploading immediately in background
   *
   * @param id - Unique ID for this upload (e.g., category ID)
   * @param file - File to upload
   * @param storagePath - Storage path (categories, items, or store-logos)
   * @param subPath - Subpath within storage path (e.g., 'store_123')
   * @returns Upload task ID
   */
  async queueUpload(
    id: string,
    file: File,
    storagePath: StoragePath,
    subPath: string
  ): Promise<string> {
    // Check if already queued
    if (this.queue.has(id)) {
      console.warn(`[ProgressiveUploader] Task ${id} already queued`);
      return id;
    }

    // Create task
    const task: UploadTask = {
      id,
      file,
      storagePath,
      subPath,
      status: 'pending',
      progress: 0,
    };

    this.queue.set(id, task);

    // Start processing queue
    this.processQueue();

    return id;
  }

  /**
   * Process upload queue
   *
   * Processes tasks up to concurrent limit
   */
  private async processQueue(): Promise<void> {
    // Get pending tasks
    const pending = Array.from(this.queue.values()).filter(
      (task) => task.status === 'pending'
    );

    // Process up to limit
    for (const task of pending) {
      if (this.currentlyUploading >= this.concurrentLimit) {
        break; // Wait for some uploads to finish
      }

      this.uploadTask(task);
    }
  }

  /**
   * Upload a single task
   *
   * @param task - Upload task
   */
  private async uploadTask(task: UploadTask): Promise<void> {
    try {
      // Mark as uploading
      task.status = 'uploading';
      this.currentlyUploading++;

      console.log(
        `[ProgressiveUploader] Starting upload ${task.id} (${this.currentlyUploading}/${this.concurrentLimit})`
      );

      // Step 1: Process image (validate + compress)
      const processedFile = await ImageProcessor.processForUpload(task.file);

      // Step 2: Upload
      const result = await this.adapter.uploadFile(
        processedFile,
        task.storagePath,
        task.subPath,
        (progress) => {
          task.progress = progress.percentage;
        }
      );

      // Step 3: Update task
      if (result.success) {
        task.status = 'completed';
        task.url = result.url;
        task.progress = 100;

        console.log(`[ProgressiveUploader] ✓ Completed ${task.id} → ${result.url}`);
      } else {
        task.status = 'failed';
        task.error = result.error;

        console.error(`[ProgressiveUploader] ✗ Failed ${task.id}:`, result.error);
      }
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';

      console.error(`[ProgressiveUploader] ✗ Exception ${task.id}:`, error);
    } finally {
      this.currentlyUploading--;

      // Continue processing queue
      this.processQueue();
    }
  }

  /**
   * Get upload status
   *
   * @param id - Upload task ID
   * @returns Upload task or undefined
   */
  getStatus(id: string): UploadTask | undefined {
    return this.queue.get(id);
  }

  /**
   * Get URL for completed upload
   *
   * @param id - Upload task ID
   * @returns URL or null if not completed
   */
  getUrl(id: string): string | null {
    const task = this.queue.get(id);

    if (task?.status === 'completed' && task.url) {
      return task.url;
    }

    return null;
  }

  /**
   * Wait for specific upload to complete
   *
   * @param id - Upload task ID
   * @returns Upload result
   */
  async waitForUpload(id: string): Promise<UploadResult> {
    const task = this.queue.get(id);

    if (!task) {
      return { success: false, error: 'Upload task not found' };
    }

    // If already completed
    if (task.status === 'completed') {
      return { success: true, url: task.url, fileName: task.file.name };
    }

    if (task.status === 'failed') {
      return { success: false, error: task.error, fileName: task.file.name };
    }

    // Wait for completion (poll every 100ms)
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const currentTask = this.queue.get(id);

        if (currentTask?.status === 'completed') {
          clearInterval(interval);
          resolve({ success: true, url: currentTask.url, fileName: currentTask.file.name });
        } else if (currentTask?.status === 'failed') {
          clearInterval(interval);
          resolve({ success: false, error: currentTask.error, fileName: currentTask.file.name });
        }
      }, 100);
    });
  }

  /**
   * Wait for all uploads to complete
   *
   * @returns Array of upload results
   */
  async waitForAll(): Promise<Map<string, UploadResult>> {
    const results = new Map<string, UploadResult>();

    // Wait for all tasks
    for (const [id, task] of this.queue.entries()) {
      const result = await this.waitForUpload(id);
      results.set(id, result);
    }

    return results;
  }

  /**
   * Get overall progress
   *
   * @returns Progress (0-100)
   */
  getOverallProgress(): number {
    if (this.queue.size === 0) {
      return 0;
    }

    const totalProgress = Array.from(this.queue.values()).reduce(
      (sum, task) => sum + task.progress,
      0
    );

    return Math.round(totalProgress / this.queue.size);
  }

  /**
   * Get queue statistics
   *
   * @returns Queue stats
   */
  getStats(): {
    total: number;
    pending: number;
    uploading: number;
    completed: number;
    failed: number;
    overallProgress: number;
  } {
    const tasks = Array.from(this.queue.values());

    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      uploading: tasks.filter((t) => t.status === 'uploading').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      overallProgress: this.getOverallProgress(),
    };
  }

  /**
   * Clear completed uploads from queue
   */
  clearCompleted(): void {
    for (const [id, task] of this.queue.entries()) {
      if (task.status === 'completed') {
        this.queue.delete(id);
      }
    }
  }

  /**
   * Clear all uploads
   */
  clearAll(): void {
    this.queue.clear();
    this.currentlyUploading = 0;
  }

  /**
   * Retry failed uploads
   */
  async retryFailed(): Promise<void> {
    const failed = Array.from(this.queue.values()).filter(
      (task) => task.status === 'failed'
    );

    for (const task of failed) {
      task.status = 'pending';
      task.error = undefined;
      task.progress = 0;
    }

    this.processQueue();
  }
}
