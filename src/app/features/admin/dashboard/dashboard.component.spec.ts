import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Company, CompanyProject, Message, Testimonial } from '@core/models';
import { AdminService } from '@core/services/admin.service';
import { AuthService } from '@core/services/auth.service';
import { CertBadgeService } from '@core/services/cert-badge.service';
import { ContentService } from '@core/services/content.service';
import { LoadingService } from '@core/services/loading.service';
import { MessagesService } from '@core/services/messages.service';
import { ResumeService } from '@core/services/resume.service';
import { ThemeService } from '@core/services/theme.service';
import { ToastService } from '@shared/components/toast/toast.component';
import { DashboardComponent } from './dashboard.component';

/**
 * Baseline regression tests for the dashboard's pure logic.
 * The (very large) template is overridden so these run fast and in isolation —
 * they exercise the class methods, not the markup.
 */
describe('DashboardComponent (logic)', () => {
  let component: DashboardComponent;

  const stub = (): unknown => ({});

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: ContentService, useValue: { getImageUrl: (s: string) => s } },
        { provide: AdminService, useValue: stub() },
        { provide: AuthService, useValue: stub() },
        { provide: MessagesService, useValue: stub() },
        { provide: ResumeService, useValue: stub() },
        { provide: ThemeService, useValue: { isDark: () => false, toggle: () => {} } },
        { provide: CertBadgeService, useValue: stub() },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: ToastService, useValue: { success: () => {}, error: () => {}, info: () => {}, warning: () => {} } },
        { provide: LoadingService, useValue: { start: () => {}, stop: () => {} } },
      ],
    })
      // Replace the heavy template/styles so we only test class behaviour.
      .overrideComponent(DashboardComponent, {
        set: { template: '<div></div>', styles: [], imports: [] },
      })
      .compileComponents();

    component = TestBed.createComponent(DashboardComponent).componentInstance;
    // Note: ngOnInit is intentionally NOT called, so no HTTP requests fire.
  });

  function makeProject(p: Partial<CompanyProject>): CompanyProject {
    return {
      id: p.id ?? 'p1',
      title: p.title ?? 'Project',
      description: p.description ?? 'desc',
      tech: p.tech ?? [],
      displayOrder: p.displayOrder ?? 0,
      status: p.status ?? null,
      impact: p.impact ?? '',
    } as CompanyProject;
  }

  function makeCompany(c: Partial<Company>): Company {
    return {
      id: c.id ?? 'c1',
      name: c.name ?? 'Acme',
      role: c.role ?? 'Engineer',
      period: c.period ?? '',
      location: c.location ?? 'Pune',
      logo: c.logo ?? '',
      projects: c.projects ?? [],
      displayOrder: c.displayOrder ?? 0,
      startDate: c.startDate,
      endDate: c.endDate,
      current: c.current,
    } as Company;
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Skill level helpers ───────────────────────────────────────────────────
  describe('skill level', () => {
    it('maps proficiency to a level label', () => {
      expect(component.skillLevel(95)).toBe('Expert');
      expect(component.skillLevel(80)).toBe('Advanced');
      expect(component.skillLevel(60)).toBe('Strong');
      expect(component.skillLevel(40)).toBe('Growing');
    });

    it('maps proficiency to a level class', () => {
      expect(component.skillLevelClass(95)).toBe('elite');
      expect(component.skillLevelClass(80)).toBe('advanced');
      expect(component.skillLevelClass(60)).toBe('strong');
      expect(component.skillLevelClass(40)).toBe('growing');
    });

    it('falls back to a default when proficiency is missing', () => {
      expect(component.skillLevel(undefined)).toBe('Advanced');
    });

    it('labels years of experience', () => {
      expect(component.skillExperienceLabel('')).toBe('Experience optional');
      expect(component.skillExperienceLabel('1')).toBe('1 year');
      expect(component.skillExperienceLabel('3')).toBe('3 years');
      expect(component.skillExperienceLabel('5+')).toBe('5+ years');
      expect(component.skillExperienceLabel('3 years')).toBe('3 years');
    });
  });

  // ── Tabs / settings ───────────────────────────────────────────────────────
  describe('tabs & settings', () => {
    it('returns a friendly label per tab', () => {
      expect(component.tabLabel('hero')).toBe('Hero Section');
      expect(component.tabLabel('companies')).toBe('Work / Companies');
      expect(component.tabLabel('settings')).toBe('Site Settings');
    });

    it('defaultSettings contains the expected top-level keys', () => {
      const s = component.defaultSettings();
      expect(s.sections).toBeDefined();
      expect(s.freelance).toBeDefined();
      expect(s.hero).toBeDefined();
      expect(s.enabledLanguages).toContain('en');
    });

    it('mergeWithDefaults deep-merges missing nested keys', () => {
      const defaults = { a: 1, nested: { x: 1, y: 2 } };
      const loaded = { nested: { x: 9 } };
      const merged = component.mergeWithDefaults(defaults, loaded as typeof defaults);
      expect(merged).toEqual({ a: 1, nested: { x: 9, y: 2 } });
    });

    it('toggleLang never removes English', () => {
      component.settingsEdit = component.defaultSettings();
      component.settingsEdit.enabledLanguages = ['en', 'hi'];
      component.toggleLang('en');
      expect(component.settingsEdit.enabledLanguages).toContain('en');
      component.toggleLang('hi');
      expect(component.settingsEdit.enabledLanguages).not.toContain('hi');
    });
  });

  // ── Project status ────────────────────────────────────────────────────────
  describe('project status', () => {
    it('returns label and icon for a status', () => {
      expect(component.projectStatusLabel('completed')).toBe('Completed');
      expect(component.projectStatusIcon('in-progress')).toBe('🔄');
    });

    it('returns "No Status" for null/undefined', () => {
      expect(component.projectStatusLabel(null)).toBe('No Status');
      expect(component.projectStatusLabel(undefined)).toBe('No Status');
    });
  });

  // ── Companies: tenure & validation ────────────────────────────────────────
  describe('companies', () => {
    it('calculates tenure across years and months', () => {
      expect(component.calcTenure(makeCompany({ startDate: '2020-01', endDate: '2022-01' }))).toBe('2y');
      expect(component.calcTenure(makeCompany({ startDate: '2020-01', endDate: '2020-04' }))).toBe('3mo');
      expect(component.calcTenure(makeCompany({ startDate: '2020-01', endDate: '2021-04' }))).toBe('1y 3mo');
    });

    it('detects an invalid date range', () => {
      expect(component.hasInvalidDateRange(makeCompany({ startDate: '2022-01', endDate: '2020-01' }))).toBeTrue();
      expect(component.hasInvalidDateRange(makeCompany({ startDate: '2020-01', endDate: '2022-01' }))).toBeFalse();
      expect(component.hasInvalidDateRange(makeCompany({}))).toBeFalse();
    });

    it('validates website URLs', () => {
      expect(component.isValidWebsite('')).toBeTrue();
      expect(component.isValidWebsite('https://example.com')).toBeTrue();
      expect(component.isValidWebsite('not-a-url')).toBeFalse();
      expect(component.isValidWebsite('ftp://example.com')).toBeFalse();
    });

    it('aggregates unique tech ordered by frequency', () => {
      const co = makeCompany({
        projects: [
          makeProject({ id: 'a', tech: ['Angular', 'Node'] }),
          makeProject({ id: 'b', tech: ['Angular'] }),
        ],
      });
      expect(component.getUniqueTechStack(co)).toEqual(['Angular', 'Node']);
      expect(component.getTechProjectCount(co, 'Angular')).toBe(2);
    });

    it('finds duplicate project titles', () => {
      const co = makeCompany({
        projects: [
          makeProject({ id: 'a', title: 'API' }),
          makeProject({ id: 'b', title: 'api' }),
          makeProject({ id: 'c', title: 'Web' }),
        ],
      });
      expect(component.getDuplicateProjectTitles(co)).toEqual(['api']);
      expect(component.isDuplicateProjectTitle(co, co.projects[0])).toBeTrue();
      expect(component.isDuplicateProjectTitle(co, co.projects[2])).toBeFalse();
    });

    it('flags projects missing details', () => {
      expect(component.isProjectDetailsMissing(makeProject({ description: '', tech: [] }))).toBeTrue();
      expect(component.isProjectDetailsMissing(makeProject({ description: 'x', tech: ['Node'] }))).toBeFalse();
    });

    it('computes completion rate from project statuses', () => {
      const co = makeCompany({
        projects: [
          makeProject({ id: 'a', status: 'completed' }),
          makeProject({ id: 'b', status: 'in-progress' }),
        ],
      });
      expect(component.getCompletedCount(co)).toBe(1);
      expect(component.getInProgressCount(co)).toBe(1);
      expect(component.getCompletionRate(co)).toBe(50);
    });
  });

  // ── Impact scoring ────────────────────────────────────────────────────────
  describe('impact scoring', () => {
    it('returns 0 for empty impact', () => {
      expect(component.impactScore('')).toBe(0);
      expect(component.impactStrengthLabel('')).toBe('Weak');
    });

    it('scores a strong, metric-rich impact statement highly', () => {
      const strong = 'Reduced API latency by 40% and improved uptime for 1000 active users';
      expect(component.impactScore(strong)).toBeGreaterThanOrEqual(75);
      expect(component.impactStrengthLabel(strong)).toBe('Strong');
      expect(component.impactStrengthClass(strong)).toBe('strong');
    });
  });

  // ── Messages ──────────────────────────────────────────────────────────────
  describe('messages', () => {
    const msg = (over: Partial<Message>): Message =>
      ({
        id: over.id ?? 'm',
        name: 'n',
        email: 'e',
        message: 'hi',
        read: over.read ?? false,
        starred: over.starred ?? false,
        receivedAt: '',
      } as Message);

    it('filters by unread and starred', () => {
      component.messages = [
        msg({ id: '1', read: false, starred: true }),
        msg({ id: '2', read: true, starred: false }),
      ];
      component.messageFilter = 'unread';
      expect(component.filteredMessages.map((m) => m.id)).toEqual(['1']);
      component.messageFilter = 'starred';
      expect(component.filteredMessages.map((m) => m.id)).toEqual(['1']);
      component.messageFilter = 'all';
      expect(component.filteredMessages.length).toBe(2);
    });

    it('returns empty string for a missing date', () => {
      expect(component.formatDate('')).toBe('');
    });
  });

  // ── Testimonials ──────────────────────────────────────────────────────────
  it('ratingStars returns an array of the given length', () => {
    expect(component.ratingStars(3).length).toBe(3);
    const t: Testimonial = { rating: 4 } as Testimonial;
    expect(component.ratingStars(t.rating).length).toBe(4);
  });

  // ── Ctrl/Cmd+S shortcut ─────────────────────────────────────────────────
  describe('save shortcut', () => {
    it('dispatches to the active tab saver and prevents default', () => {
      const saveSpy = spyOn(component, 'saveSkills');
      const event = new KeyboardEvent('keydown');
      const preventSpy = spyOn(event, 'preventDefault');
      component.activeTab = 'skills';
      component.onSaveShortcut(event);
      expect(preventSpy).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();
    });

    it('does nothing on read-only tabs', () => {
      const event = new KeyboardEvent('keydown');
      const preventSpy = spyOn(event, 'preventDefault');
      component.activeTab = 'analytics';
      component.onSaveShortcut(event);
      expect(preventSpy).not.toHaveBeenCalled();
    });

    it('skips saving while a save is already in flight', () => {
      const saveSpy = spyOn(component, 'saveHero');
      component.activeTab = 'hero';
      component.saving = true;
      component.onSaveShortcut(new KeyboardEvent('keydown'));
      expect(saveSpy).not.toHaveBeenCalled();
    });
  });
});
