import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { StorageService } from './storage.service';
import { map, Observable, of, tap } from 'rxjs';

// Supported languages â€” to add a new one:
//  1. Create src/assets/i18n/<code>.json with all translation keys
//  2. Add the code here
//  3. Add a label entry in LANG_LABELS below
export type Lang = 'en' | 'hi' | 'jp';
export const SUPPORTED_LANGS: Lang[] = ['en', 'hi', 'jp'];

export const LANG_LABELS: Record<Lang, string> = {
  en: 'EN',
  hi: '\u0939\u093f', // à¤¹à¤¿
  jp: '\u65e5', // æ—¥
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private static readonly STORAGE_KEY = 'lang';
  private static readonly OVERRIDES_KEY = 'i18n-overrides';
  private readonly http: HttpClient = inject(HttpClient);
  private readonly storage: StorageService = inject(StorageService);
  /** Currently active language code */
  private lang = signal<Lang>(this.getSavedLang());

  /** Languages currently enabled via admin settings (subset of SUPPORTED_LANGS) */
  activeLangs = signal<Lang[]>(SUPPORTED_LANGS);

  /** Loaded translation map for the current language */
  private translations = signal<Record<string, string>>({});

  /** Per-language cache so we don't re-fetch on every toggle */
  private cache: Partial<Record<Lang, Record<string, string>>> = {};
  private overrides: Partial<Record<Lang, Record<string, string>>> =
    this.storage.get<Partial<Record<Lang, Record<string, string>>>>(LanguageService.OVERRIDES_KEY) ??
    {};

  constructor() {
    this.loadLang(this.lang());
  }

  /**
   * Called once after site settings load. Restricts the toggle cycle to the
   * admin-configured subset. If the current lang is no longer enabled, falls
   * back to the first enabled language.
   */
  setEnabledLangs(langs: string[]): void {
    const valid = langs.filter((l): l is Lang => SUPPORTED_LANGS.includes(l as Lang)) as Lang[];
    const active = valid.length > 0 ? valid : (['en'] as Lang[]);
    this.activeLangs.set(active);
    if (!active.includes(this.lang())) {
      this.setLang(active[0]);
    }
  }

  /** Cycle through admin-enabled languages only */
  toggle(): void {
    const active = this.activeLangs();
    const idx = active.indexOf(this.lang());
    const next = active[(idx + 1) % active.length];
    this.setLang(next);
  }

  /** Switch to a specific language directly */
  setLang(lang: Lang): void {
    this.lang.set(lang);
    this.storage.set(LanguageService.STORAGE_KEY, lang);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang);
    }
    this.loadLang(lang);
  }

  /** Current language button label (shown in the toggle button) */
  label(): string {
    return LANG_LABELS[this.lang()];
  }

  /** Translate a key. Returns the key itself if not found (never crashes). */
  t(key: string): string {
    return this.translations()[key] ?? key;
  }

  getMessagesForLang(lang: Lang): Observable<Record<string, string>> {
    if (this.cache[lang]) {
      return of(this.applyOverrides(lang, this.cache[lang]!));
    }

    return this.http.get<Record<string, string>>(`/assets/i18n/${lang}.json`).pipe(
      tap((data) => {
        this.cache[lang] = data;
      }),
      map((data) => this.applyOverrides(lang, data)),
    );
  }

  saveMessagesForLang(lang: Lang, messages: Record<string, string>): void {
    this.overrides[lang] = { ...messages };
    this.storage.set(LanguageService.OVERRIDES_KEY, this.overrides);

    if (this.lang() === lang) {
      this.loadLang(lang);
    }
  }

  resetMessagesForLang(lang: Lang): void {
    if (this.overrides[lang]) {
      delete this.overrides[lang];
      this.storage.set(LanguageService.OVERRIDES_KEY, this.overrides);
    }

    if (this.lang() === lang) {
      this.loadLang(lang);
    }
  }

  isHindi(): boolean {
    return this.lang() === 'hi';
  }

  private loadLang(lang: Lang): void {
    if (this.cache[lang]) {
      this.translations.set(this.applyOverrides(lang, this.cache[lang]!));
      return;
    }
    this.http.get<Record<string, string>>(`/assets/i18n/${lang}.json`).subscribe({
      next: (data) => {
        this.cache[lang] = data;
        // Only apply if this lang is still active (user didn't toggle away)
        if (this.lang() === lang) this.translations.set(this.applyOverrides(lang, data));
      },
      error: () => {
        // Fallback: if the JSON fails to load, try English
        if (lang !== 'en') this.loadFallbackToEnglish();
      },
    });
  }

  private loadFallbackToEnglish(): void {
    if (this.cache['en']) {
      this.translations.set(this.cache['en']!);
      return;
    }
    this.http.get<Record<string, string>>('/assets/i18n/en.json').subscribe({
      next: (data) => {
        this.cache['en'] = data;
        this.translations.set(this.applyOverrides('en', data));
      },
    });
  }

  private applyOverrides(lang: Lang, base: Record<string, string>): Record<string, string> {
    const override = this.overrides[lang] ?? {};
    return { ...base, ...override };
  }

  private getSavedLang(): Lang {
    const saved = this.storage.get<Lang>(LanguageService.STORAGE_KEY);
    return saved && SUPPORTED_LANGS.includes(saved) ? saved : 'en';
  }
}
