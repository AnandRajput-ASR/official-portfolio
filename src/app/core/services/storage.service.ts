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

  private getStore(scope: 'local' | 'session'): Storage | null {
    try {
      if (typeof window === 'undefined') return null;
      return scope === 'session' ? window.sessionStorage : window.localStorage;
    } catch {
      return null;
    }
  }

  /** Returns null when localStorage is unavailable (SSR / private mode). */
  private get store(): Storage | null {
    return this.getStore('local');
  }

  /** Returns null when sessionStorage is unavailable (SSR / private mode). */
  private get sessionStore(): Storage | null {
    return this.getStore('session');
  }

  private key(name: string): string {
    return `${StorageService.NAMESPACE}:${name}`;
  }

  get<T>(name: string): T | null {
    return this.getFrom(this.store, name);
  }

  getSession<T>(name: string): T | null {
    return this.getFrom(this.sessionStore, name);
  }

  private getFrom<T>(store: Storage | null, name: string): T | null {
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
    this.setTo(this.store, name, value);
  }

  setSession<T>(name: string, value: T): void {
    this.setTo(this.sessionStore, name, value);
  }

  private setTo<T>(store: Storage | null, name: string, value: T): void {
    if (!store) return;
    try {
      store.setItem(this.key(name), JSON.stringify(value));
    } catch {
      // Quota exceeded or denied — fail silently. Auth state should never
      // crash the app.
    }
  }

  remove(name: string): void {
    this.removeFrom(this.store, name);
  }

  removeSession(name: string): void {
    this.removeFrom(this.sessionStore, name);
  }

  private removeFrom(store: Storage | null, name: string): void {
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
