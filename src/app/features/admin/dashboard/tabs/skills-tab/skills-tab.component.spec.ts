import { TestBed } from '@angular/core/testing';
import { AdminService } from '@core/services/admin.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ContentService } from '@core/services/content.service';
import { LoadingService } from '@core/services/loading.service';
import { ToastService } from '@shared/components/toast/toast.component';
import { SkillsTabComponent } from './skills-tab.component';

/**
 * Logic tests for the skills tab's pure presentation helpers
 * (`skillLevel`, `skillLevelClass`, `skillExperienceLabel`).
 * The heavy template is overridden and `ngOnInit` is not called.
 */
describe('SkillsTabComponent (logic)', () => {
  let component: SkillsTabComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillsTabComponent],
      providers: [
        { provide: AdminService, useValue: {} },
        { provide: ContentService, useValue: { getImageUrl: (s: string) => s } },
        { provide: LoadingService, useValue: { start: () => {}, stop: () => {} } },
        { provide: ConfirmService, useValue: { ask: () => Promise.resolve(true) } },
        { provide: ToastService, useValue: { success: () => {}, error: () => {} } },
      ],
    })
      .overrideComponent(SkillsTabComponent, {
        set: { template: '<div></div>', styles: [], imports: [] },
      })
      .compileComponents();

    component = TestBed.createComponent(SkillsTabComponent).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

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
