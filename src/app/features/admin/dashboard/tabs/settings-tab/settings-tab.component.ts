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
  private store = inject(AdminContentStore);
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  settingsEdit!: SiteSettings;
  newFreelanceService = '';

  readonly sectionList: { key: string; icon: string; label: string; desc: string }[] = [
    { key: 'hero', icon: '🏠', label: 'Hero Section', desc: 'Main landing area with name, bio, CTA' },
    { key: 'about', icon: '👤', label: 'About Section', desc: 'Story, stats, Accenture badge' },
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

  ngOnInit(): void {
    const raw = this.store.content()?.siteSettings || ({} as SiteSettings);
    this.settingsEdit = this.mergeWithDefaults(this.defaultSettings(), raw);
    this.store.registerSaver('settings', () => this.saveSettings());
  }

  ngOnDestroy(): void {
    this.store.unregisterSaver('settings');
  }

  markDirty(): void {
    this.store.markDirty('settings');
  }

  saveSettings(): void {
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
        this.toast.success('Settings saved!');
        this.cdr.markForCheck();
      },
      error: () => {
        this.store.saving.set(false);
        this.toast.error('Save failed');
        this.cdr.markForCheck();
      },
    });
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

  /**
   * Deep-merge defaults into a loaded settings object so that any newly
   * introduced nested key is filled in without clobbering user values.
   */
  private mergeWithDefaults<T extends object>(defaults: T, loaded: Partial<T>): T {
    const result = JSON.parse(JSON.stringify(defaults)) as T;
    for (const key of Object.keys(loaded) as (keyof T)[]) {
      const v = loaded[key];
      if (v !== undefined && v !== null) {
        if (
          typeof v === 'object' &&
          !Array.isArray(v) &&
          typeof result[key] === 'object' &&
          !Array.isArray(result[key])
        ) {
          (result as any)[key] = this.mergeWithDefaults(result[key] as object, v as object);
        } else {
          result[key] = JSON.parse(JSON.stringify(v)) as T[keyof T];
        }
      }
    }
    return result;
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
        accentureBadge: {
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
