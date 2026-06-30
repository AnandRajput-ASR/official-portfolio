import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AdminContentStore } from '@core/services/admin-content.store';
import { AdminService } from '@core/services/admin.service';
import { AuditLogService } from '@core/services/audit-log.service';
import { AuthService } from '@core/services/auth.service';
import { ConfirmService } from '@core/services/confirm.service';
import { MessagesStateService } from '@core/services/messages-state.service';
import { ResumeStateService } from '@core/services/resume-state.service';
import { ThemeService } from '@core/services/theme.service';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';

/**
 * Tests for the dashboard *shell*.
 *
 * All edit buffers and per-tab logic now live in `tabs/<name>-tab/` and are
 * covered by their own specs (plus the pure helpers in
 * `@core/utils/company-metrics`). These tests exercise only the shell's
 * responsibilities: tab switching with the unsaved-changes guard, the sidebar,
 * the dirty-tab bar, and the Ctrl/Cmd+S dispatch.
 */
describe('DashboardComponent (shell)', () => {
  let component: DashboardComponent;
  let store: AdminContentStore;
  let confirmAsk: jasmine.Spy;
  let messagesLoad: jasmine.Spy;
  let auditLog: jasmine.Spy;

  beforeEach(async () => {
    confirmAsk = jasmine.createSpy('ask').and.resolveTo(true);
    messagesLoad = jasmine.createSpy('load');
    auditLog = jasmine.createSpy('log');

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: AdminService, useValue: { getAll: () => of(null) } },
        { provide: AuthService, useValue: {} },
        { provide: AuditLogService, useValue: { log: auditLog } },
        { provide: MessagesStateService, useValue: { load: messagesLoad } },
        { provide: ResumeStateService, useValue: { load: () => {} } },
        { provide: ThemeService, useValue: { isDark: () => false, toggle: () => {} } },
        { provide: ConfirmService, useValue: { ask: confirmAsk } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    })
      // Replace the heavy template/styles so we only test shell behaviour.
      .overrideComponent(DashboardComponent, {
        set: { template: '<div></div>', styles: [], imports: [] },
      })
      .compileComponents();

    component = TestBed.createComponent(DashboardComponent).componentInstance;
    store = TestBed.inject(AdminContentStore);
    // Note: ngOnInit is intentionally NOT called, so no HTTP requests fire.
  });

  afterEach(() => {
    store.dirtyTabs.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('tabLabel', () => {
    it('returns a friendly label per tab', () => {
      expect(component.tabLabel('hero')).toBe('Hero Section');
      expect(component.tabLabel('companies')).toBe('Work / Companies');
      expect(component.tabLabel('settings')).toBe('Site Settings');
    });
  });

  describe('setTab', () => {
    it('switches tab when there are no unsaved changes', async () => {
      await component.setTab('skills');
      expect(component.activeTab).toBe('skills');
      expect(confirmAsk).not.toHaveBeenCalled();
    });

    it('loads messages when switching to the messages tab', async () => {
      await component.setTab('messages');
      expect(messagesLoad).toHaveBeenCalled();
    });

    it('is a no-op when selecting the already-active tab', async () => {
      await component.setTab('hero');
      expect(component.activeTab).toBe('hero');
      expect(confirmAsk).not.toHaveBeenCalled();
    });

    it('stays on the dirty tab when the user cancels the guard', async () => {
      confirmAsk.and.resolveTo(false);
      store.markDirty('hero');
      await component.setTab('skills');
      expect(component.activeTab).toBe('hero');
      expect(store.isDirty('hero')).toBeTrue();
    });

    it('leaves and clears the dirty marker when the user confirms', async () => {
      confirmAsk.and.resolveTo(true);
      store.markDirty('hero');
      await component.setTab('skills');
      expect(component.activeTab).toBe('skills');
      expect(store.isDirty('hero')).toBeFalse();
    });
  });

  describe('dirty bar', () => {
    it('exposes the dirty tab count from the store', () => {
      expect(component.dirtyTabCount).toBe(0);
      store.markDirty('hero');
      store.markDirty('skills');
      expect(component.dirtyTabCount).toBe(2);
    });

    it('joins dirty tab labels for display', () => {
      store.markDirty('hero');
      store.markDirty('settings');
      expect(component.dirtyTabsLabel()).toBe('Hero Section, Site Settings');
    });
  });

  describe('sidebar', () => {
    it('toggles and closes', () => {
      expect(component.sidebarOpen).toBeFalse();
      component.toggleSidebar();
      expect(component.sidebarOpen).toBeTrue();
      component.closeSidebar();
      expect(component.sidebarOpen).toBeFalse();
    });

    it('mobileSetTab switches the tab and closes the sidebar', () => {
      component.sidebarOpen = true;
      component.mobileSetTab('analytics');
      expect(component.activeTab).toBe('analytics');
      expect(component.sidebarOpen).toBeFalse();
    });
  });

  describe('save shortcut', () => {
    it('dispatches to the active tab saver and prevents default', () => {
      const saver = jasmine.createSpy('saver');
      store.registerSaver('skills', saver);
      component.activeTab = 'skills';
      const event = new KeyboardEvent('keydown');
      const preventSpy = spyOn(event, 'preventDefault');

      component.onSaveShortcut(event);

      expect(preventSpy).toHaveBeenCalled();
      expect(saver).toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalled();
      store.unregisterSaver('skills');
    });

    it('does nothing on read-only tabs without a registered saver', () => {
      component.activeTab = 'analytics';
      const event = new KeyboardEvent('keydown');
      const preventSpy = spyOn(event, 'preventDefault');

      component.onSaveShortcut(event);

      expect(preventSpy).not.toHaveBeenCalled();
    });

    it('skips saving while a save is already in flight', () => {
      const saver = jasmine.createSpy('saver');
      store.registerSaver('hero', saver);
      component.activeTab = 'hero';
      store.saving.set(true);

      component.onSaveShortcut(new KeyboardEvent('keydown'));

      expect(saver).not.toHaveBeenCalled();
      store.saving.set(false);
      store.unregisterSaver('hero');
    });
  });
});
