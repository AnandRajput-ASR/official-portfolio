import { effect, inject, Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';

export type Theme = 'dark' | 'light';
export type ThemeToken =
  | 'bg'
  | 'surface'
  | 'surface2'
  | 'border'
  | 'text'
  | 'muted'
  | 'amber'
  | 'green';

export type ThemeTokens = Record<ThemeToken, string>;

const DARK_TOKENS: ThemeTokens = {
  bg: '#0d0d0d',
  surface: '#141414',
  surface2: '#1a1a1a',
  border: '#252525',
  text: '#f0ede8',
  muted: '#7a7570',
  amber: '#f5a623',
  green: '#4caf50',
};

const LIGHT_TOKENS: ThemeTokens = {
  bg: '#faf9f7',
  surface: '#ffffff',
  surface2: '#f2f0ec',
  border: '#e0ddd8',
  text: '#1a1816',
  muted: '#6b6560',
  amber: '#d4890a',
  green: '#2e7d32',
};

type ThemeTokenOverrides = Partial<ThemeTokens>;

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private static readonly STORAGE_KEY = 'theme';
  private static readonly TOKENS_STORAGE_KEY = 'themeTokens';
  private storage = inject(StorageService);
  theme = signal<Theme>(this.getSavedTheme());
  private tokenOverrides = signal<ThemeTokenOverrides>(this.getSavedTokenOverrides());

  constructor() {
    // Apply theme to <html> element whenever it changes
    effect(() => {
      const t = this.theme();
      const overrides = this.tokenOverrides();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', t);
        const tokens = { ...this.getBaseTokensForTheme(t), ...overrides };
        Object.entries(tokens).forEach(([key, value]) => {
          document.documentElement.style.setProperty(`--${key}`, value);
        });
      }
      this.storage.set(ThemeService.STORAGE_KEY, t);
      this.storage.set(ThemeService.TOKENS_STORAGE_KEY, overrides);
    });
  }

  toggle(): void {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  isDark(): boolean {
    return this.theme() === 'dark';
  }

  getThemeTokens(): ThemeTokens {
    return { ...this.getBaseTokensForTheme(this.theme()), ...this.tokenOverrides() };
  }

  updateThemeTokens(tokens: ThemeTokenOverrides): void {
    this.tokenOverrides.set({ ...this.tokenOverrides(), ...tokens });
  }

  resetThemeTokens(): void {
    this.tokenOverrides.set({});
  }

  private getBaseTokensForTheme(theme: Theme): ThemeTokens {
    return theme === 'dark' ? DARK_TOKENS : LIGHT_TOKENS;
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

  private getSavedTokenOverrides(): ThemeTokenOverrides {
    const saved = this.storage.get<unknown>(ThemeService.TOKENS_STORAGE_KEY);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    const normalized: ThemeTokenOverrides = {};
    const validKeys: ThemeToken[] = [
      'bg',
      'surface',
      'surface2',
      'border',
      'text',
      'muted',
      'amber',
      'green',
    ];
    for (const key of validKeys) {
      const value = (saved as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) {
        normalized[key] = value.trim();
      }
    }
    return normalized;
  }
}
