import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SiteSettings } from '@core/models';
import { AdminContentStore } from '@core/services/admin-content.store';
import { AdminService } from '@core/services/admin.service';
import { Lang, SUPPORTED_LANGS, LanguageService } from '@core/services/language.service';
import { ToastService } from '@shared/components/toast/toast.component';

@Component({
  selector: 'app-settings-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-tab.component.html',
  styleUrls: ['./settings-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsTabComponent implements OnInit, OnDestroy {
  private static readonly AUTOSAVE_DELAY_MS = 1200;

  private store = inject(AdminContentStore);
  private adminService = inject(AdminService);
  private languageService = inject(LanguageService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  settingsEdit!: SiteSettings;
  newFreelanceService = '';
  autosaveEnabled = false;
  private initialSnapshot = '';

  readonly i18nLangs: Lang[] = SUPPORTED_LANGS;
  i18nEditorLang: Lang = 'en';
  i18nEditorText = '';
  i18nEditorLoading = false;

  collapsedGroups = new Set<'core' | 'presentation' | 'content'>(['presentation', 'content']);

  readonly changeLabels: Record<string, string> = {
    openToWork: 'Open to Work Banner',
    openToWorkText: 'Banner HTML Text',
    freelanceEnabled: 'Freelance Mode',
    sectionFlags: 'Section Visibility',
    navLogo: 'Nav Logo Text',
    navResume: 'Nav Resume Button',
    footerText: 'Footer Tagline',
    footerCopy: 'Footer Copyright',
    siteUrl: 'Site URL',
    resumeProtected: 'Resume Download Gate',
    enabledLanguages: 'Enabled Languages',
    learningEnabled: 'Learning Widget',
    visitorShow: 'Visitor Counter',
    visitorThreshold: 'Visitor Counter Threshold',
    heroBadge: 'Hero Badge Text',
    heroCardTitle: 'Hero Card Subtitle',
    aboutHeading: 'About Heading',
    aboutBadge: 'Company Badge',
    tickerItems: 'Ticker Items',
    contactHeading: 'Contact Heading',
    contactSuccess: 'Contact Success Message',
  };

  readonly sectionList: { key: string; icon: string; label: string; desc: string }[] = [
    { key: 'hero', icon: '🏠', label: 'Hero Section', desc: 'Main landing area with name, bio, CTA' },
    { key: 'about', icon: '👤', label: 'About Section', desc: 'Story, stats, company badge' },
    { key: 'ticker', icon: '📡', label: 'Skills Ticker', desc: 'Scrolling tech marquee bar' },
    { key: 'skills', icon: '⚡', label: 'Skills Grid', desc: 'Core skills with proficiency bars' },
    { key: 'companies', icon: '🏢', label: 'Work Experience', desc: 'Company-grouped work accordion' },
    { key: 'personalProjects', icon: '🔧', label: 'Side Projects', desc: 'Personal & freelance projects' },
    { key: 'certifications', icon: '🏅', label: 'Certifications', desc: 'Azure/cloud badges with Credly links' },
    { key: 'experience', icon: '📋', label: 'Timeline', desc: 'Career & education timeline' },
    { key: 'testimonials', icon: '💬', label: 'Testimonials', desc: 'Colleague & client quotes' },
    { key: 'blog', icon: '✍️', label: 'Blog / Writing', desc: 'Technical articles section' },
    { key: 'stats', icon: '📊', label: 'Stats Row', desc: 'Years, certifications, projects counter' },
    { key: 'contact', icon: '✉', label: 'Contact Form', desc: 'Contact section with form' },
    { key: 'resumeBanner', icon: '📄', label: 'Resume Download Banner', desc: 'Fixed bottom resume download strip' },
    { key: 'footer', icon: '🔻', label: 'Footer', desc: 'Footer links and copyright' },
  ];

  get saving(): boolean {
    return this.store.saving();
  }

  get hasUnsavedChanges(): boolean {
    return this.store.isDirty('settings');
  }

  get changedLabels(): string[] {
    return this.changedKeys().map((key) => this.changeLabels[key] || key);
  }

  get changeSummary(): string {
    const labels = this.changedLabels;
    if (!labels.length) return 'No pending changes';
    if (labels.length <= 3) return labels.join(' • ');
    return `${labels.slice(0, 3).join(' • ')} +${labels.length - 3} more`;
  }

  ngOnInit(): void {
    const raw = this.normalizeLegacySettings(this.store.content()?.siteSettings || {});
    this.settingsEdit = this.mergeWithDefaults(this.defaultSettings(), raw);
    this.initialSnapshot = this.snapshot(this.settingsEdit);
    this.store.registerSaver('settings', () => this.saveSettings());
    this.loadI18nEditor(this.i18nEditorLang);
  }

  ngOnDestroy(): void {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    this.store.unregisterSaver('settings');
  }

  markDirty(): void {
    this.store.markDirty('settings');
    if (this.autosaveEnabled) {
      this.scheduleAutosave();
    }
  }

  onAutosaveToggle(enabled: boolean): void {
    this.autosaveEnabled = enabled;
    if (!enabled && this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
      return;
    }
    if (enabled && this.hasUnsavedChanges) {
      this.scheduleAutosave();
    }
  }

  saveSettings(): void {
    const prepared = this.prepareSettingsForSave(this.settingsEdit);
    const validationError = this.validateSettings(prepared);
    if (validationError) {
      this.toast.error(validationError);
      return;
    }

    this.settingsEdit = prepared;
    const changedCount = this.changedLabels.length;
    this.store.saving.set(true);
    this.adminService.updateSettings(this.settingsEdit).subscribe({
      next: () => {
        const current = this.store.content();
        if (current) {
          current.siteSettings = JSON.parse(JSON.stringify(this.settingsEdit));
          this.store.content.set({ ...current });
        }
        this.store.saving.set(false);
        this.store.clearDirty('settings');
        this.initialSnapshot = this.snapshot(this.settingsEdit);
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.toast.success(`Saved ${changedCount} change${changedCount === 1 ? '' : 's'} at ${time}`);
        this.cdr.markForCheck();
      },
      error: () => {
        this.store.saving.set(false);
        this.toast.error('Save failed');
        this.cdr.markForCheck();
      },
    });
  }

  discardChanges(): void {
    const raw = this.normalizeLegacySettings(this.store.content()?.siteSettings || {});
    this.settingsEdit = this.mergeWithDefaults(this.defaultSettings(), raw);
    this.initialSnapshot = this.snapshot(this.settingsEdit);
    this.newFreelanceService = '';
    this.store.clearDirty('settings');
    this.cdr.markForCheck();
    this.toast.success('Unsaved changes discarded');
  }

  isGroupOpen(group: 'core' | 'presentation' | 'content'): boolean {
    return !this.collapsedGroups.has(group);
  }

  toggleGroup(group: 'core' | 'presentation' | 'content'): void {
    if (this.collapsedGroups.has(group)) this.collapsedGroups.delete(group);
    else this.collapsedGroups.add(group);
  }

  expandAllGroups(): void {
    this.collapsedGroups.clear();
  }

  collapseSecondaryGroups(): void {
    this.collapsedGroups = new Set<'core' | 'presentation' | 'content'>(['presentation', 'content']);
  }

  getSectionFlag(key: string): boolean {
    return (this.settingsEdit?.sections as Record<string, boolean>)?.[key] ?? true;
  }

  setSectionFlag(key: string, val: boolean): void {
    (this.settingsEdit.sections as Record<string, boolean>)[key] = val;
    this.markDirty();
  }

  toggleLang(code: string): void {
    const langs: string[] = (this.settingsEdit.enabledLanguages ?? ['en', 'hi', 'jp']).slice();
    const idx = langs.indexOf(code);
    if (idx === -1) {
      langs.push(code);
    } else if (code !== 'en') {
      langs.splice(idx, 1);
    }
    this.settingsEdit.enabledLanguages = langs;
  }

  addFreelanceService(): void {
    const v = this.newFreelanceService.trim();
    if (!v || this.settingsEdit.freelance.services.includes(v)) return;
    this.settingsEdit.freelance.services.push(v);
    this.newFreelanceService = '';
    this.markDirty();
  }

  removeFreelanceService(s: string): void {
    this.settingsEdit.freelance.services = this.settingsEdit.freelance.services.filter(
      (x) => x !== s,
    );
    this.markDirty();
  }

  addHeroPill(e: Event): void {
    const v = (e.target as HTMLInputElement).value.trim();
    if (v && !this.settingsEdit.hero.pills.includes(v)) {
      this.settingsEdit.hero.pills.push(v);
      (e.target as HTMLInputElement).value = '';
      this.markDirty();
    }
  }

  removeHeroPill(p: string): void {
    this.settingsEdit.hero.pills = this.settingsEdit.hero.pills.filter((x) => x !== p);
    this.markDirty();
  }

  addCardSkill(e: Event): void {
    const v = (e.target as HTMLInputElement).value.trim();
    if (!this.settingsEdit.hero.cardSkills) this.settingsEdit.hero.cardSkills = [];
    if (v && !this.settingsEdit.hero.cardSkills.includes(v)) {
      this.settingsEdit.hero.cardSkills.push(v);
      (e.target as HTMLInputElement).value = '';
      this.markDirty();
    }
  }

  removeCardSkill(s: string): void {
    this.settingsEdit.hero.cardSkills = this.settingsEdit.hero.cardSkills.filter((x) => x !== s);
    this.markDirty();
  }

  addExtraSkill(e: Event): void {
    const v = (e.target as HTMLInputElement).value.trim();
    if (!this.settingsEdit.hero.extraSkills) this.settingsEdit.hero.extraSkills = [];
    if (v && !this.settingsEdit.hero.extraSkills.includes(v)) {
      this.settingsEdit.hero.extraSkills.push(v);
      (e.target as HTMLInputElement).value = '';
      this.markDirty();
    }
  }

  removeExtraSkill(s: string): void {
    this.settingsEdit.hero.extraSkills = this.settingsEdit.hero.extraSkills.filter((x) => x !== s);
    this.markDirty();
  }

  addTickerItem(e: Event): void {
    const v = (e.target as HTMLInputElement).value.trim();
    if (!this.settingsEdit.ticker) this.settingsEdit.ticker = { items: [] };
    if (v && !this.settingsEdit.ticker.items.includes(v)) {
      this.settingsEdit.ticker.items.push(v);
      (e.target as HTMLInputElement).value = '';
      this.markDirty();
    }
  }

  removeTickerItem(item: string): void {
    if (!this.settingsEdit.ticker) return;
    this.settingsEdit.ticker.items = this.settingsEdit.ticker.items.filter((x) => x !== item);
    this.markDirty();
  }

  addAboutParagraph(): void {
    this.settingsEdit.about.paragraphs.push('');
    this.markDirty();
  }

  removeAboutParagraph(i: number): void {
    this.settingsEdit.about.paragraphs.splice(i, 1);
    this.markDirty();
  }

  addTagToNew(list: string[], e: Event): void {
    const v = (e.target as HTMLInputElement).value.trim();
    if (v && !list.includes(v)) {
      list.push(v);
      (e.target as HTMLInputElement).value = '';
    }
  }

  removeTagFromNew(list: string[], tag: string): void {
    const i = list.indexOf(tag);
    if (i > -1) list.splice(i, 1);
  }

  onI18nLangChange(lang: Lang): void {
    this.i18nEditorLang = lang;
    this.loadI18nEditor(lang);
  }

  saveI18nEditor(): void {
    try {
      const parsed = JSON.parse(this.i18nEditorText) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        this.toast.error('Translation JSON must be an object of key-value pairs.');
        return;
      }

      const normalized: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string') normalized[k] = v;
      }

      this.languageService.saveMessagesForLang(this.i18nEditorLang, normalized);
      this.toast.success(`Saved translation overrides for ${this.i18nEditorLang.toUpperCase()}`);
    } catch {
      this.toast.error('Invalid JSON. Please fix formatting before saving.');
    }
  }

  resetI18nEditor(): void {
    this.languageService.resetMessagesForLang(this.i18nEditorLang);
    this.loadI18nEditor(this.i18nEditorLang);
    this.toast.success(`Reset overrides for ${this.i18nEditorLang.toUpperCase()}`);
  }

  reloadI18nEditor(): void {
    this.loadI18nEditor(this.i18nEditorLang);
  }

  private scheduleAutosave(): void {
    if (!this.hasUnsavedChanges || this.saving) return;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      this.autosaveTimer = null;
      if (this.hasUnsavedChanges && !this.saving) this.saveSettings();
    }, SettingsTabComponent.AUTOSAVE_DELAY_MS);
  }

  private loadI18nEditor(lang: Lang): void {
    this.i18nEditorLoading = true;
    this.languageService.getMessagesForLang(lang).subscribe({
      next: (data) => {
        this.i18nEditorText = JSON.stringify(data, null, 2);
        this.i18nEditorLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.i18nEditorText = '{}';
        this.i18nEditorLoading = false;
        this.toast.error('Could not load translations for selected language.');
        this.cdr.markForCheck();
      },
    });
  }

  private changedKeys(): string[] {
    const prev = JSON.parse(this.initialSnapshot || '{}') as Record<string, unknown>;
    const next = JSON.parse(this.snapshot(this.settingsEdit)) as Record<string, unknown>;
    return Object.keys(next).filter((k) => prev[k] !== next[k]);
  }

  private snapshot(settings: SiteSettings): string {
    const s = this.prepareSettingsForSave(settings);
    const flat: Record<string, unknown> = {
      openToWork: s.openToWork,
      openToWorkText: s.openToWorkText,
      freelanceEnabled: s.freelance.enabled,
      sectionFlags: JSON.stringify(s.sections),
      navLogo: s.nav.logoText,
      navResume: s.nav.showResume,
      footerText: s.footer.text,
      footerCopy: s.footer.copy,
      siteUrl: s.siteUrl,
      resumeProtected: s.resumeProtected,
      enabledLanguages: JSON.stringify(s.enabledLanguages),
      learningEnabled: s.learning.enabled,
      visitorShow: s.visitorCount.show,
      visitorThreshold: s.visitorCount.threshold,
      heroBadge: s.hero.badgeText,
      heroCardTitle: s.hero.cardTitle,
      aboutHeading: s.about.heading,
      aboutBadge: JSON.stringify(s.about.companyBadge),
      tickerItems: JSON.stringify(s.ticker.items),
      contactHeading: s.contact.heading,
      contactSuccess: s.contact.successMessage,
    };
    return JSON.stringify(flat);
  }

  private prepareSettingsForSave(settings: SiteSettings): SiteSettings {
    const clone = JSON.parse(JSON.stringify(settings)) as SiteSettings;

    clone.openToWorkText = this.normalizeHtmlLineBreaks(this.cleanText(clone.openToWorkText));
    clone.freelance.ctaTitle = this.cleanText(clone.freelance.ctaTitle);
    clone.freelance.ctaSubtitle = this.cleanText(clone.freelance.ctaSubtitle);
    clone.freelance.services = this.cleanStringList(clone.freelance.services);
    clone.nav.logoText = this.cleanText(clone.nav.logoText);
    clone.footer.text = this.cleanText(clone.footer.text);
    clone.footer.copy = this.cleanText(clone.footer.copy);
    clone.siteUrl = this.cleanText(clone.siteUrl);
    clone.about.heading = this.normalizeHtmlLineBreaks(this.cleanText(clone.about.heading));
    clone.about.paragraphs = clone.about.paragraphs.map((p) => this.normalizeHtmlLineBreaks(this.cleanText(p)));
    clone.about.companyBadge.company = this.cleanText(clone.about.companyBadge.company);
    clone.about.companyBadge.role = this.cleanText(clone.about.companyBadge.role);
    clone.about.companyBadge.period = this.cleanText(clone.about.companyBadge.period);
    clone.about.companyBadge.award = this.normalizeHtmlLineBreaks(this.cleanText(clone.about.companyBadge.award));
    clone.ticker.items = this.cleanStringList(clone.ticker.items);
    clone.contact.heading = this.normalizeHtmlLineBreaks(this.cleanText(clone.contact.heading));
    clone.contact.successMessage = this.cleanText(clone.contact.successMessage);
    clone.hero.badgeText = this.cleanText(clone.hero.badgeText);
    clone.hero.cardTitle = this.cleanText(clone.hero.cardTitle);
    clone.hero.cardStatusText = this.cleanText(clone.hero.cardStatusText);
    clone.hero.ctaPrimary = this.cleanText(clone.hero.ctaPrimary);
    clone.hero.ctaSecondary = this.cleanText(clone.hero.ctaSecondary);
    clone.hero.pills = this.cleanStringList(clone.hero.pills);
    clone.hero.cardSkills = this.cleanStringList(clone.hero.cardSkills);
    clone.hero.extraSkills = this.cleanStringList(clone.hero.extraSkills);
    clone.enabledLanguages = Array.from(new Set(clone.enabledLanguages.map((l) => this.cleanText(l).toLowerCase()).filter(Boolean)));
    if (!clone.enabledLanguages.includes('en')) clone.enabledLanguages.unshift('en');
    clone.visitorCount.threshold = Math.max(0, Number(clone.visitorCount.threshold) || 0);

    return clone;
  }

  private validateSettings(settings: SiteSettings): string | null {
    if (!settings.siteUrl) return 'Site URL is required';
    try {
      const parsed = new URL(settings.siteUrl);
      if (!/^https?:$/.test(parsed.protocol)) return 'Site URL must start with http:// or https://';
    } catch {
      return 'Site URL is invalid';
    }

    if (!settings.enabledLanguages.length) return 'At least one language must be enabled';
    if (!settings.enabledLanguages.includes('en')) return 'English must remain enabled as fallback';

    return null;
  }

  private cleanText(value: string): string {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  private cleanStringList(list: string[]): string[] {
    return Array.from(new Set((list || []).map((v) => this.cleanText(v)).filter(Boolean)));
  }

  private normalizeHtmlLineBreaks(value: string): string {
    return value.replace(/<\s*br\s*\/?\s*>/gi, '<br>');
  }

  /**
   * Deep-merge defaults into a loaded settings object so that any newly
   * introduced nested key is filled in without clobbering user values.
   */
  private mergeWithDefaults<T extends object>(defaults: T, loaded: Partial<T>): T {
    const result = JSON.parse(JSON.stringify(defaults)) as T;
    const resultRecord = result as Record<string, unknown>;
    const loadedRecord = loaded as Record<string, unknown>;

    for (const key of Object.keys(loadedRecord)) {
      const v = loadedRecord[key];
      if (v !== undefined && v !== null) {
        const resultValue = resultRecord[key];
        if (
          typeof v === 'object' &&
          !Array.isArray(v) &&
          typeof resultValue === 'object' &&
          resultValue !== null &&
          !Array.isArray(resultValue)
        ) {
          resultRecord[key] = this.mergeWithDefaults(
            resultValue as Record<string, unknown>,
            v as Record<string, unknown>,
          );
        } else {
          resultRecord[key] = JSON.parse(JSON.stringify(v));
        }
      }
    }
    return result;
  }

  private normalizeLegacySettings(raw: unknown): SiteSettings {
    const normalized = JSON.parse(JSON.stringify(raw || {})) as SiteSettings & {
      about?: {
        accentureBadge?: { company: string; role: string; period: string; award: string };
        companyBadge?: { company: string; role: string; period: string; award: string };
      };
    };

    if (normalized.about?.accentureBadge && !normalized.about.companyBadge) {
      normalized.about.companyBadge = normalized.about.accentureBadge;
    }

    return normalized as SiteSettings;
  }

  private defaultSettings(): SiteSettings {
    return {
      openToWork: false,
      openToWorkText: 'Open to Freelance',
      sections: {
        testimonials: true,
        blog: true,
        analytics: true,
        skills: true,
        certifications: true,
        personalProjects: true,
        experience: true,
        about: true,
        hero: true,
        stats: true,
        companies: true,
        contact: true,
        footer: true,
        ticker: true,
        resumeBanner: true,
      },
      freelance: {
        enabled: false,
        ctaTitle: 'Got a project in mind?',
        ctaSubtitle:
          'I take on Angular development, cloud integrations, and DevOps consulting projects.',
        services: ['Angular SPA Development', 'Azure Cloud Setup', 'CI/CD Pipeline Design'],
        showInHero: true,
        showInAbout: true,
        showCtaSection: true,
        showInContact: true,
      },
      hero: {
        badgeText: 'Available for Freelance · Pune, India',
        ctaPrimary: 'Hire Me →',
        ctaSecondary: 'See My Work',
        pills: [],
        cardTitle: '@ Accenture · Pune',
        cardStatusText: 'Open to work',
        cardStats: [
          { value: '5+', label: 'Years' },
          { value: '4', label: 'Azure Certs' },
          { value: '4', label: 'Projects' },
        ],
        cardSkills: ['Angular', 'TypeScript', 'Node.js', 'Azure DevOps', 'AWS', 'PostgreSQL'],
        extraSkills: ['Git', 'VS Code', 'Postman', 'Grafana', 'QuickSight', 'SAP Integration'],
      },
      about: {
        heading: 'I build things that enterprises trust.',
        paragraphs: [],
        companyBadge: {
          company: 'Accenture',
          role: 'Packaged App Development Analyst',
          period: 'Jan 2021 – Present · Pune, India',
          award: '🏆 2× Star of the Month',
        },
      },
      ticker: {
        items: [
          'Angular',
          'TypeScript',
          'Azure DevOps',
          'Node.js',
          'AWS Lambda',
          'RxJS',
          'NgRx',
          'PostgreSQL',
          'AZ-400 Expert',
          'CI/CD Pipelines',
        ],
      },
      contact: {
        heading: "Let's build<br><span>something great</span><br>together.",
        successMessage: "Message sent! I'll get back to you shortly.",
      },
      footer: {
        text: 'Anand Rajput — Angular Developer & Azure Engineer',
        copy: '© 2026 · Pune, India · Built with Angular & Node.js',
      },
      nav: { logoText: 'AR', showResume: true },
      siteUrl: 'https://anandrajput.dev',
      resumeProtected: false,
      enabledLanguages: ['en', 'hi', 'jp'],
      learning: {
        enabled: false,
        items: [
          { label: 'Designing Distributed Systems', icon: '📚', type: 'book' },
          { label: 'AWS Solutions Architect', icon: '🎓', type: 'course' },
          { label: 'Rust', icon: '⚙️', type: 'tech' },
        ],
      },
      visitorCount: {
        show: false,
        threshold: 100,
      },
    };
  }
}
