import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReducedMotionDirective } from '@core/directives/reduced-motion.directive';
import { PortfolioContent } from '@core/models';
import { ContentService } from '@core/services/content.service';
import { LanguageService } from '@core/services/language.service';
import { LoadingService } from '@core/services/loading.service';
import { ObservabilityService } from '@core/services/observability.service';
import { ResumeInfo, ResumeService } from '@core/services/resume.service';
import { StorageService } from '@core/services/storage.service';
import { ThemeService } from '@core/services/theme.service';
import { catchError, finalize, map, of, switchMap, tap } from 'rxjs';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  contentService = inject(ContentService);
  resumeService = inject(ResumeService);
  themeService = inject(ThemeService);
  langService = inject(LanguageService);
  private loadingService = inject(LoadingService);
  private observability = inject(ObservabilityService);
  private storage = inject(StorageService);
  private destroyRef = inject(DestroyRef);

  readonly content = signal<PortfolioContent | null>(null);
  readonly loading = signal(true);
  readonly apiError = signal(false);
  readonly resumeInfo = signal<ResumeInfo | null>(null);
  /** Visitor counter (public footer widget). */
  readonly visitorCount = signal<number | null>(null);

  /** Visible (non-deleted) testimonials, derived from loaded content. */
  readonly visibleTestimonials = computed(() =>
    (this.content()?.testimonials ?? []).filter((t) => t.visible && t.is_deleted !== true),
  );

  /** Published (non-deleted) blog posts, derived from loaded content. */
  readonly publishedPosts = computed(() =>
    (this.content()?.blogPosts ?? []).filter((p) => this.contentService.isBlogPostLive(p)),
  );

  /** Ticker items from settings, falling back to a default tech list. */
  readonly tickerItems = computed(
    () => this.content()?.siteSettings?.ticker?.items ?? HomeComponent.DEFAULT_TICKER,
  );

  openCompanies = new Set<string>();
  otwDismissed = this.storage.getWithExpiry<boolean>('otw-dismissed') === true;
  private destroyed = false;
  private scrollHandler: (() => void) | null = null;
  private observers: IntersectionObserver[] = [];

  // Resume gate modal
  resumeGateOpen = false;
  resumeGateSource = 'unknown';

  private static readonly DEFAULT_TICKER = [
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
  ];

  ngOnInit(): void {
    this.loadContent();
    this.loadResumeInfo();
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

  trackResumeDownload(source = 'unknown'): void {
    this.contentService.trackEvent('resumeDownload', { source });
    this.contentService.trackResumeFunnel('download', source);
  }

  trackSocialClick(): void {
    this.contentService.trackEvent('socialClick');
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
    this.apiError.set(false);
    this.loading.set(true);
    this.loadContent();
  }

  private loadContent(): void {
    this.loadingService.start('home-content');
    this.contentService
      .getAllCached()
      .pipe(
        tap((data) => {
          this.content.set(data);
          if (data.siteSettings?.enabledLanguages?.length) {
            this.langService.setEnabledLangs(data.siteSettings.enabledLanguages);
          }
          setTimeout(() => {
            this.setupScrollReveal();
            this.setupCounters();
          }, 0);
        }),
        switchMap((data) => {
          const threshold = data.siteSettings?.visitorCount?.threshold ?? 100;
          if (!data.siteSettings?.visitorCount?.show) {
            return of<number | null>(null);
          }
          return this.contentService.getVisitorCount().pipe(
            map((count) => (count.thisMonth >= threshold ? count.thisMonth : null)),
            catchError((err) => {
              this.observability.captureError(err, { source: 'home.visitorCount' });
              return of<number | null>(null);
            }),
          );
        }),
        finalize(() => this.loadingService.stop('home-content')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (count) => {
          this.visitorCount.set(count);
          this.loading.set(false);
          this.apiError.set(false);
          this.contentService.trackEvent('pageView');
          this.contentService.trackResumeFunnel('view', 'resume-cta');
        },
        error: () => {
          this.loading.set(false);
          this.apiError.set(true);
        },
      });
  }

  private loadResumeInfo(): void {
    this.resumeService
      .getInfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (info) => this.resumeInfo.set(info),
        error: (err) => this.observability.captureError(err, { source: 'home.resumeInfo' }),
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
    const source = this.resolveResumeSource(event);
    this.contentService.trackResumeFunnel('click', source);

    if (this.content()?.siteSettings?.resumeProtected) {
      event.preventDefault();
      this.resumeGateSource = source;
      this.resumeGateOpen = true;
      // Tracking fires only after the gate is submitted (see ResumeGateComponent)
    } else {
      // Direct download — track immediately
      this.trackResumeDownload(source);
    }
  }

  private resolveResumeSource(event: Event): string {
    const target = event.target as HTMLElement | null;
    if (!target) return 'unknown';
    if (target.closest('.btn-nav-resume')) return 'nav';
    if (target.closest('.btn-hero-resume')) return 'hero';
    if (target.closest('.btn-resume-dl')) return 'banner';
    return 'resume-cta';
  }
}
