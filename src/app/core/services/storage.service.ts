import { Injectable } from '@angular/core';

/**
 * SSR-safe localStorage wrapper.
 *
 * Every direct `localStorage.getItem` / `setItem` in the codebase goes
 * through this service. It:
 *  - namespaces keys so we can wipe or migrate in one place
 *  - silently swallows failures (Safari private mode, quota exceeded)
 *  - JSON-encodes on the way in, JSON-decodes on the way out
 *  - returns the provided fallback on any failure path
 *
 * When Angular SSR is added in a later phase, this is the only file
 * that needs to know.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private static readonly NAMESPACE = 'ar-portfolio';

  /** Returns null when localStorage is unavailable (SSR / private mode). */
  private get store(): Storage | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  private key(name: string): string {
    return `${StorageService.NAMESPACE}:${name}`;
  }

  get<T>(name: string): T | null {
    const store = this.store;
    if (!store) return null;
    try {
      const raw = store.getItem(this.key(name));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set<T>(name: string, value: T): void {
    const store = this.store;
    if (!store) return;
    try {
      store.setItem(this.key(name), JSON.stringify(value));
    } catch {
      // Quota exceeded or denied — fail silently. Auth state should never
      // crash the app.
    }
  }

  remove(name: string): void {
    const store = this.store;
    if (!store) return;
    try {
      store.removeItem(this.key(name));
    } catch {
      /* noop */
    }
  }

  /** Used by future phases (theme/OTW-dismiss) where we want TTL. */
  getWithExpiry<T>(name: string): T | null {
    const wrapper = this.get<{ v: T; exp: number }>(name);
    if (!wrapper) return null;
    if (wrapper.exp > 0 && wrapper.exp < Date.now()) {
      this.remove(name);
      return null;
    }
    return wrapper.v;
  }

  setWithExpiry<T>(name: string, value: T, ttlMs: number): void {
    this.set(name, { v: value, exp: Date.now() + ttlMs });
  }
}
