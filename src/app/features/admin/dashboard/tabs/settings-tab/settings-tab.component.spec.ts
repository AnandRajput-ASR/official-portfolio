import { TestBed } from '@angular/core/testing';
import { SiteSettings } from '@core/models';
import { AdminService } from '@core/services/admin.service';
import { ToastService } from '@shared/components/toast/toast.component';
import { SettingsTabComponent } from './settings-tab.component';

/**
 * Logic tests for the settings tab: the language toggle (which must never
 * drop English) and the deep-merge / defaults helpers used to keep loaded
 * settings forward-compatible.
 */
describe('SettingsTabComponent (logic)', () => {
  let component: SettingsTabComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsTabComponent],
      providers: [
        { provide: AdminService, useValue: {} },
        { provide: ToastService, useValue: { success: () => {}, error: () => {} } },
      ],
    })
      .overrideComponent(SettingsTabComponent, {
        set: { template: '<div></div>', styles: [], imports: [] },
      })
      .compileComponents();

    component = TestBed.createComponent(SettingsTabComponent).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('toggleLang', () => {
    beforeEach(() => {
      component.settingsEdit = { enabledLanguages: ['en', 'hi'] } as SiteSettings;
    });

    it('never removes English', () => {
      component.toggleLang('en');
      expect(component.settingsEdit.enabledLanguages).toContain('en');
    });

    it('removes a non-English language that is enabled', () => {
      component.toggleLang('hi');
      expect(component.settingsEdit.enabledLanguages).not.toContain('hi');
    });

    it('adds a language that is not yet enabled', () => {
      component.toggleLang('jp');
      expect(component.settingsEdit.enabledLanguages).toContain('jp');
    });
  });

  describe('defaults & deep-merge', () => {
    it('defaultSettings contains the expected top-level keys', () => {
      const s = (component as unknown as { defaultSettings(): SiteSettings }).defaultSettings();
      expect(s.sections).toBeDefined();
      expect(s.freelance).toBeDefined();
      expect(s.hero).toBeDefined();
      expect(s.enabledLanguages).toContain('en');
    });

    it('mergeWithDefaults deep-merges missing nested keys', () => {
      const merge = (component as unknown as {
        mergeWithDefaults<T extends object>(d: T, l: Partial<T>): T;
      }).mergeWithDefaults.bind(component);
      const defaults = { a: 1, nested: { x: 1, y: 2 } };
      const loaded = { nested: { x: 9 } };
      const merged = merge(defaults, loaded as typeof defaults);
      expect(merged).toEqual({ a: 1, nested: { x: 9, y: 2 } });
    });
  });
});
