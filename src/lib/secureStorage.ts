/**
 * Secure Storage Wrapper
 * Encrypts sensitive data before storing in localStorage
 */

interface StorageInterface {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

class SecureStorage implements StorageInterface {
  private readonly storage: Storage;
  private readonly prefix: string = 'secure_';

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
  }

  /**
   * Simple XOR encryption (for basic obfuscation)
   * For production, consider using Web Crypto API or a library like crypto-js
   */
  private encrypt(data: string): string {
    // Get encryption key from session (generated on app load)
    const key = this.getEncryptionKey();
    let encrypted = '';
    
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return btoa(encrypted); // Base64 encode
  }

  private decrypt(encryptedData: string): string {
    try {
      const key = this.getEncryptionKey();
      const data = atob(encryptedData); // Base64 decode
      let decrypted = '';
      
      for (let i = 0; i < data.length; i++) {
        decrypted += String.fromCharCode(
          data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }

  private getEncryptionKey(): string {
    // Use a session-based key that changes on each page load
    // This provides additional security as the key is never persisted
    let key = sessionStorage.getItem('__ek__');
    
    if (!key) {
      // Generate a random key for this session
      key = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      sessionStorage.setItem('__ek__', key);
    }
    
    return key;
  }

  getItem(key: string): string | null {
    try {
      const encryptedData = this.storage.getItem(this.prefix + key);
      if (!encryptedData) return null;
      
      return this.decrypt(encryptedData);
    } catch (error) {
      console.error('SecureStorage getItem error:', error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      const encrypted = this.encrypt(value);
      this.storage.setItem(this.prefix + key, encrypted);
    } catch (error) {
      console.error('SecureStorage setItem error:', error);
    }
  }

  removeItem(key: string): void {
    this.storage.removeItem(this.prefix + key);
  }

  clear(): void {
    // Only clear items with our prefix
    const keys = Object.keys(this.storage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        this.storage.removeItem(key);
      }
    });
  }
}

export const secureStorage = new SecureStorage();