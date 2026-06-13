import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    Component,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
    inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PortfolioContent } from '@core/models';
import { ReducedMotionDirective } from '@core/directives/reduced-motion.directive';
import { ContentService } from '@core/services/content.service';
import { LanguageService } from '@core/services/language.service';
import { LoadingService } from '@core/services/loading.service';
import { ResumeInfo, ResumeService } from '@core/services/resume.service';
import { StorageService } from '@core/services/storage.service';
import { ThemeService } from '@core/services/theme.service';
import { AboutSectionComponent } from './sections/about/about-section.component';
import { BlogSectionComponent } from './sections/blog/blog-section.component';
import { CertsSectionComponent } from './sections/certs/certs-section.component';
import { ContactSectionComponent } from './sections/contact/contact-section.component';
import { ExperienceSectionComponent } from './sections/experience/experience-section.component';
import { FooterSectionComponent } from './sections/footer/footer-section.component';
import { FreelanceCtaSectionComponent } from './sections/freelance-cta/freelance-cta-section.component';
import { HeaderSectionComponent } from './sections/header/header-section.component';
import { HeroSectionComponent } from './sections/hero/hero-section.component';
import { LearningSectionComponent } from './sections/learning/learning-section.component';
import { PersonalProjectsSectionComponent } from './sections/personal-projects/personal-projects-section.component';
import { ResumeBannerComponent } from './sections/resume-banner/resume-banner.component';
import { ResumeGateComponent } from './sections/resume-gate/resume-gate.component';
import { SkillsSectionComponent } from './sections/skills/skills-section.component';
import { TestimonialsSectionComponent } from './sections/testimonials/testimonials-section.component';
import { TickerSectionComponent } from './sections/ticker/ticker-section.component';
import { WorkSectionComponent } from './sections/work/work-section.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ReducedMotionDirective,
    HeaderSectionComponent,
    HeroSectionComponent,
    TickerSectionComponent,
    AboutSectionComponent,
    SkillsSectionComponent,
    WorkSectionComponent,
    PersonalProjectsSectionComponent,
    CertsSectionComponent,
    ExperienceSectionComponent,
    TestimonialsSectionComponent,
    BlogSectionComponent,
    LearningSectionComponent,
    FreelanceCtaSectionComponent,
    ContactSectionComponent,
    ResumeBannerComponent,
    FooterSectionComponent,
    ResumeGateComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  contentService = inject(ContentService);
  resumeService = inject(ResumeService);
  themeService = inject(ThemeService);
  langService = inject(LanguageService);
  private loadingService = inject(LoadingService);
  private storage = inject(StorageService);

  content: PortfolioContent | null = null;
  loading = true;
  apiError = false;
  resumeInfo: ResumeInfo | null = null;
  openCompanies = new Set<string>();
  otwDismissed = this.storage.getWithExpiry<boolean>('otw-dismissed') === true;
  private destroyed = false;
  private scrollHandler: (() => void) | null = null;
  private observers: IntersectionObserver[] = [];

  // Visitor counter (public footer widget)
  visitorCount: number | null = null;

  // Resume gate modal
  resumeGateOpen = false;

  ngOnInit(): void {
    this.loadingService.start('home-content');
    this.contentService.getAll().subscribe({
      next: (data) => {
        this.content = data;
        this.loading = false;
        this.refreshCaches();
        // Propagate admin-configured enabled languages to LanguageService
        if (data.siteSettings?.enabledLanguages?.length) {
          this.langService.setEnabledLangs(data.siteSettings.enabledLanguages);
        }
        // run reveal AFTER DOM renders
        setTimeout(() => {
          this.setupScrollReveal();
          this.setupCounters();
        }, 0);

        this.loadingService.stop('home-content');
        // Track page view
        this.contentService.trackEvent('pageView');
        // Load visitor count for public footer widget
        const threshold = data.siteSettings?.visitorCount?.threshold ?? 100;
        if (data.siteSettings?.visitorCount?.show) {
          this.contentService.getVisitorCount().subscribe({
            next: (c) => {
              if (c.thisMonth >= threshold) this.visitorCount = c.thisMonth;
            },
            error: () => {},
          });
        }
      },
      error: () => {
        this.loading = false;
        this.apiError = true;
        this.loadingService.stop('home-content');
      },
    });
    this.resumeService.getInfo().subscribe({
      next: (info) => (this.resumeInfo = info),
      error: () => {},
    });
  }

  ngAfterViewInit(): void {
    this.scrollHandler = () => {
      if (this.destroyed) return;
      const nav = document.getElementById('mainNav');
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    // Track contact section view
    const contactEl = document.getElementById('contact');
    if (contactEl) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            this.contentService.trackEvent('contactView');
            io.disconnect();
          }
        },
        { threshold: 0.3 },
      );
      io.observe(contactEl);
      this.observers.push(io);
    }
  }

  dismissOtw(): void {
    this.otwDismissed = true;
    // Persist 7 days; the banner re-shows after a week of absence.
    this.storage.setWithExpiry('otw-dismissed', true, 7 * 24 * 60 * 60 * 1000);
  }

  toggleCompany(id: string): void {
    if (this.openCompanies.has(id)) this.openCompanies.delete(id);
    else this.openCompanies.add(id);
  }
  isCompanyOpen(id: string): boolean {
    return this.openCompanies.has(id);
  }

  calcTenure(co: { startDate?: string; endDate?: string; current?: boolean }): string {
    if (!co.startDate) return '';
    const start = new Date(co.startDate + '-01');
    const end = co.current || !co.endDate ? new Date() : new Date(co.endDate + '-01');
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (months < 1) return '';
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y === 0) return `${m}mo`;
    if (m === 0) return `${y}yr`;
    return `${y}yr ${m}mo`;
  }

  trackProjectClick(projectId: string): void {
    this.contentService.trackEvent('projectClick', { projectId });
  }

  trackResumeDownload(): void {
    this.contentService.trackEvent('resumeDownload');
  }

  trackSocialClick(): void {
    this.contentService.trackEvent('socialClick');
  }

  private _visibleTestis: any[] = [];
  private _publishedPosts: any[] = [];

  visibleTestimonials() {
    return this._visibleTestis;
  }
  publishedPosts() {
    return this._publishedPosts;
  }

  private refreshCaches(): void {
    this._visibleTestis = (this.content?.testimonials || []).filter((t) => t.visible);
    this._publishedPosts = (this.content?.blogPosts || []).filter((p) => p.published);
  }

  tickerItems(): string[] {
    return (
      this.content?.siteSettings?.ticker?.items || [
        'Angular',
        'TypeScript',
        'Azure DevOps',
        'Node.js',
        'AWS Lambda',
        'RxJS',
        'NgRx',
        'PostgreSQL',
        'Cosmos DB',
        'AZ-400 Expert',
        'CI/CD Pipelines',
      ]
    );
  }

  private setupScrollReveal(): void {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add('visible');
              // Animate skill proficiency bar
              const bar = entry.target.querySelector('.sk-prof-fill') as HTMLElement;
              if (bar) setTimeout(() => (bar.style.width = bar.dataset['width'] || '80%'), 200);
            }, 80);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    this.observers.push(io);
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    }, 100);
  }

  private setupCounters(): void {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const target = +(el.dataset['target'] || 0);
            const suffix = el.dataset['suffix'] || '';
            let current = 0;
            const inc = target / 40;
            const timer = setInterval(() => {
              current += inc;
              if (current >= target) {
                current = target;
                clearInterval(timer);
              }
              el.textContent = Math.floor(current) + suffix;
            }, 40);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.5 },
    );
    this.observers.push(io);
    setTimeout(() => {
      document.querySelectorAll('.stat-num[data-target]').forEach((el) => io.observe(el));
    }, 100);
  }

  retryLoad(): void {
    this.apiError = false;
    this.loading = true;
    this.loadingService.start('home-content');
    this.contentService.getAll().subscribe({
      next: (data) => {
        this.content = data;
        this.loading = false;
        this.apiError = false;
        this.refreshCaches();
        if (data.siteSettings?.enabledLanguages?.length) {
          this.langService.setEnabledLangs(data.siteSettings.enabledLanguages);
        }
        // run reveal AFTER DOM renders
        setTimeout(() => {
          this.setupScrollReveal();
          this.setupCounters();
        }, 0);

        this.loadingService.stop('home-content');
        this.contentService.trackEvent('pageView');
      },
      error: () => {
        this.loading = false;
        this.apiError = true;
        this.loadingService.stop('home-content');
      },
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.scrollHandler) window.removeEventListener('scroll', this.scrollHandler);
    this.observers.forEach((io) => io.disconnect());
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  /** Opens the resume-gate modal if protection is on, otherwise downloads directly. */
  handleResumeClick(event: Event): void {
    if (this.content?.siteSettings?.resumeProtected) {
      event.preventDefault();
      this.resumeGateOpen = true;
      // Tracking fires only after the gate is submitted (see ResumeGateComponent)
    } else {
      // Direct download — track immediately
      this.trackResumeDownload();
    }
  }
}
