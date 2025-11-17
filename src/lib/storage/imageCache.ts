/**
 * Image Cache Service
 *
 * Smart caching for image previews using:
 * 1. IndexedDB (primary - best for PWA, works offline)
 * 2. localStorage (fallback for older browsers)
 * 3. Memory cache (fallback if storage unavailable)
 *
 * Persists across page refreshes and handles mobile/PWA edge cases.
 */

interface CachedImage {
  id: string;
  dataUrl: string;
  fileName: string;
  fileType: string;
  timestamp: number;
}

const DB_NAME = 'ImageCacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';
const LOCALSTORAGE_PREFIX = 'img_cache_';
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

class ImageCache {
  private memoryCache: Map<string, CachedImage> = new Map();
  private db: IDBDatabase | null = null;
  private dbInitialized: boolean = false;
  private useIndexedDB: boolean = true;
  private useLocalStorage: boolean = true;

  constructor() {
    this.initIndexedDB();
    this.checkLocalStorage();
  }

  private async initIndexedDB(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      this.useIndexedDB = false;
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn('[ImageCache] IndexedDB not available, using fallback');
        this.useIndexedDB = false;
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.dbInitialized = true;
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    } catch (error) {
      console.warn('[ImageCache] IndexedDB initialization failed:', error);
      this.useIndexedDB = false;
    }
  }

  private checkLocalStorage(): void {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      this.useLocalStorage = true;
    } catch {
      console.warn('[ImageCache] localStorage not available');
      this.useLocalStorage = false;
    }
  }

  async set(id: string, file: File): Promise<void> {
    const dataUrl = await this.fileToDataUrl(file);
    const cached: CachedImage = {
      id,
      dataUrl,
      fileName: file.name,
      fileType: file.type,
      timestamp: Date.now(),
    };

    this.memoryCache.set(id, cached);

    if (this.useIndexedDB && this.dbInitialized) {
      await this.setIndexedDB(cached);
    } else if (this.useLocalStorage) {
      this.setLocalStorage(cached);
    }
  }

  async get(id: string): Promise<string | null> {
    if (this.memoryCache.has(id)) {
      const cached = this.memoryCache.get(id)!;
      if (this.isValid(cached)) {
        return cached.dataUrl;
      }
      this.memoryCache.delete(id);
    }

    if (this.useIndexedDB && this.dbInitialized) {
      const cached = await this.getIndexedDB(id);
      if (cached && this.isValid(cached)) {
        this.memoryCache.set(id, cached);
        return cached.dataUrl;
      }
    }

    if (this.useLocalStorage) {
      const cached = this.getLocalStorage(id);
      if (cached && this.isValid(cached)) {
        this.memoryCache.set(id, cached);
        return cached.dataUrl;
      }
    }

    return null;
  }

  async delete(id: string): Promise<void> {
    this.memoryCache.delete(id);

    if (this.useIndexedDB && this.dbInitialized) {
      await this.deleteIndexedDB(id);
    }

    if (this.useLocalStorage) {
      this.deleteLocalStorage(id);
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.useIndexedDB && this.dbInitialized) {
      await this.clearIndexedDB();
    }

    if (this.useLocalStorage) {
      this.clearLocalStorage();
    }
  }

  private async setIndexedDB(cached: CachedImage): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(cached);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getIndexedDB(id: string): Promise<CachedImage | null> {
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  private async deleteIndexedDB(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  private async clearIndexedDB(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  private setLocalStorage(cached: CachedImage): void {
    try {
      localStorage.setItem(
        `${LOCALSTORAGE_PREFIX}${cached.id}`,
        JSON.stringify(cached)
      );
    } catch (error) {
      console.warn('[ImageCache] localStorage.setItem failed:', error);
    }
  }

  private getLocalStorage(id: string): CachedImage | null {
    try {
      const item = localStorage.getItem(`${LOCALSTORAGE_PREFIX}${id}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  private deleteLocalStorage(id: string): void {
    try {
      localStorage.removeItem(`${LOCALSTORAGE_PREFIX}${id}`);
    } catch {
      // Ignore
    }
  }

  private clearLocalStorage(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(LOCALSTORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // Ignore
    }
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private isValid(cached: CachedImage): boolean {
    return Date.now() - cached.timestamp < MAX_CACHE_AGE_MS;
  }
}

export const imageCache = new ImageCache();
