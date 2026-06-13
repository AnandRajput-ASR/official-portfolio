import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { AdminContentStore } from '@core/services/admin-content.store';
import { AdminService } from '@core/services/admin.service';
import { AuditLogService } from '@core/services/audit-log.service';
import { AuthService } from '@core/services/auth.service';
import { ConfirmService } from '@core/services/confirm.service';
import { MessagesStateService } from '@core/services/messages-state.service';
import { ResumeStateService } from '@core/services/resume-state.service';
import { ThemeService } from '@core/services/theme.service';
import { ToastComponent } from '@shared/components/toast/toast.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { AccountTabComponent } from './tabs/account-tab/account-tab.component';
import { ActiveTab } from './tabs/active-tab.type';
import { AnalyticsTabComponent } from './tabs/analytics-tab/analytics-tab.component';
import { AuditLogComponent } from './tabs/audit-log/audit-log.component';
import { BlogTabComponent } from './tabs/blog-tab/blog-tab.component';
import { CertificationsTabComponent } from './tabs/certifications-tab/certifications-tab.component';
import { CompaniesTabComponent } from './tabs/companies-tab/companies-tab.component';
import { ExperienceTabComponent } from './tabs/experience-tab/experience-tab.component';
import { HeroTabComponent } from './tabs/hero-tab/hero-tab.component';
import { MessagesTabComponent } from './tabs/messages-tab/messages-tab.component';
import { PersonalTabComponent } from './tabs/personal-tab/personal-tab.component';
import { ResumeTabComponent } from './tabs/resume-tab/resume-tab.component';
import { SettingsTabComponent } from './tabs/settings-tab/settings-tab.component';
import { SkillsTabComponent } from './tabs/skills-tab/skills-tab.component';
import { StatsTabComponent } from './tabs/stats-tab/stats-tab.component';
import { TestimonialsTabComponent } from './tabs/testimonials-tab/testimonials-tab.component';

/**
 * Admin dashboard shell.
 *
 * Holds:
 *  - the sidebar nav and active tab state
 *  - the dirty-changes bar and unsaved-changes confirm guard
 *  - the Ctrl/Cmd+S shortcut that dispatches to whichever tab registered a saver
 *  - the toast and confirm-dialog mount points (both signals-driven)
 *
 * All edit buffers, save logic, and per-tab UI now live in
 * `tabs/<name>-tab/`. The shell never holds tab-specific state.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ToastComponent,
    ConfirmDialogComponent,
    AccountTabComponent,
    AnalyticsTabComponent,
    AuditLogComponent,
    BlogTabComponent,
    CertificationsTabComponent,
    CompaniesTabComponent,
    ExperienceTabComponent,
    HeroTabComponent,
    MessagesTabComponent,
    PersonalTabComponent,
    ResumeTabComponent,
    SettingsTabComponent,
    SkillsTabComponent,
    StatsTabComponent,
    TestimonialsTabComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  protected store = inject(AdminContentStore);
  private adminService = inject(AdminService);
  protected audit = inject(AuditLogService);
  auth = inject(AuthService);
  messagesService = inject(MessagesStateService);
  resumeService = inject(ResumeStateService);
  themeService = inject(ThemeService);
  confirm = inject(ConfirmService);

  sidebarOpen = false;
  activeTab: ActiveTab = 'hero';

  ngOnInit(): void {
    this.adminService.getAll().subscribe({
      next: (data) => this.store.content.set(data),
      error: () => this.store.content.set(null),
    });
    this.resumeService.load();
  }

  async setTab(tab: ActiveTab): Promise<void> {
    if (tab === this.activeTab) return;
    if (this.store.dirtyTabs.has(this.activeTab)) {
      const ok = await this.confirm.ask({
        title: 'Unsaved Changes',
        message: `You have unsaved changes in <strong>${this.tabLabel(this.activeTab)}</strong>. If you leave now, your edits will be lost.`,
        confirmText: 'Leave Anyway',
        cancelText: 'Stay & Save',
        type: 'warning',
        icon: '⚠️',
      });
      if (!ok) return;
      // Each tab owns its edit buffer; "leaving" only clears the dirty
      // marker. The user can re-enter and save their changes.
      this.store.clearDirty(this.activeTab);
    }
    this.activeTab = tab;
    if (tab === 'messages') this.messagesService.load();
  }

  tabLabel(tab: ActiveTab): string {
    const map: Record<ActiveTab, string> = {
      hero: 'Hero Section',
      skills: 'Skills',
      companies: 'Work / Companies',
      personal: 'Side Projects',
      experience: 'Timeline',
      certifications: 'Certifications',
      testimonials: 'Testimonials',
      blog: 'Blog',
      analytics: 'Analytics',
      settings: 'Site Settings',
      messages: 'Messages',
      resume: 'Resume',
      account: 'Account',
      stats: 'Stats',
      audit: 'Audit Log',
    };
    return map[tab] || tab;
  }

  /** Bound to the dirty-bar `*ngIf`. Re-reads whenever the store's
   *  derived `dirty()` signal ticks. */
  get dirtyTabCount(): number {
    return this.store.dirty();
  }

  getDirtyTabsLabel(): string {
    return Array.from(this.store.dirtyTabs)
      .map((t) => this.tabLabel(t))
      .join(', ');
  }

  @HostListener('window:beforeunload', ['$event'])
  onUnload(e: BeforeUnloadEvent): void {
    if (this.store.dirtyTabs.size > 0) {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  /** Ctrl/Cmd+S invokes whichever tab registered a save handler. */
  @HostListener('window:keydown.control.s', ['$event'])
  @HostListener('window:keydown.meta.s', ['$event'])
  onSaveShortcut(e: Event): void {
    const saver = this.store.getSaver(this.activeTab);
    if (!saver) return;
    e.preventDefault();
    if (this.store.saving()) return;
    this.audit.log(this.activeTab, 'save', 'Ctrl+S save');
    saver();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  mobileSetTab(tab: ActiveTab): void {
    void this.setTab(tab);
    this.closeSidebar();
  }
}
