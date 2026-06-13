import { Injectable, signal, effect, inject } from '@angular/core';
import { StorageService } from './storage.service';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private static readonly STORAGE_KEY = 'theme';
  private storage = inject(StorageService);
  theme = signal<Theme>(this.getSavedTheme());

  constructor() {
    // Apply theme to <html> element whenever it changes
    effect(() => {
      const t = this.theme();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', t);
      }
      this.storage.set(ThemeService.STORAGE_KEY, t);
    });
  }

  toggle(): void {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  isDark(): boolean {
    return this.theme() === 'dark';
  }

  private getSavedTheme(): Theme {
    const saved = this.storage.get<Theme>(ThemeService.STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    // Respect system preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
}
