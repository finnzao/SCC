import { logger } from '@/lib/utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

const STORAGE_PREFIX = 'rc:';

class RequestCache {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cache = new Map<string, CacheEntry<any>>();

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.expiresIn;
  }

  private storageKey(key: string): string {
    return `${STORAGE_PREFIX}${key}`;
  }

  private saveToStorage<T>(key: string, entry: CacheEntry<T>) {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(this.storageKey(key), JSON.stringify(entry));
    } catch {
      logger.warn('[RequestCache] Falha ao salvar no sessionStorage');
    }
  }

  private loadFromStorage<T>(key: string): CacheEntry<T> | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(this.storageKey(key));
      if (!raw) return null;
      return JSON.parse(raw) as CacheEntry<T>;
    } catch {
      return null;
    }
  }

  private removeFromStorage(key: string) {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(this.storageKey(key));
    } catch {
      // ignore
    }
  }

  set<T>(key: string, data: T, expiresInMs: number = 5 * 60 * 1000) {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresIn: expiresInMs,
    };
    this.cache.set(key, entry);
    this.saveToStorage(key, entry);
  }

  get<T>(key: string): T | null {
    const memEntry = this.cache.get(key);
    if (memEntry) {
      if (this.isExpired(memEntry)) {
        this.cache.delete(key);
        this.removeFromStorage(key);
        return null;
      }
      return memEntry.data as T;
    }

    const storageEntry = this.loadFromStorage<T>(key);
    if (storageEntry) {
      if (this.isExpired(storageEntry)) {
        this.removeFromStorage(key);
        return null;
      }
      this.cache.set(key, storageEntry);
      return storageEntry.data;
    }

    return null;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(key?: string) {
    if (key) {
      this.cache.delete(key);
      this.removeFromStorage(key);
    } else {
      this.cache.clear();
      if (typeof window !== 'undefined') {
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i);
            if (k?.startsWith(STORAGE_PREFIX)) keysToRemove.push(k);
          }
          keysToRemove.forEach(k => sessionStorage.removeItem(k));
        } catch {
          // ignore
        }
      }
    }
  }

  clearExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.expiresIn) {
        this.cache.delete(key);
        this.removeFromStorage(key);
      }
    }
  }
}

export const requestCache = new RequestCache();
