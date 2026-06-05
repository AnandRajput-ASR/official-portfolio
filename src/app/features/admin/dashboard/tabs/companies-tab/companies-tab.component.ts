import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Company, CompanyProject } from '@core/models';
import {
  applyDefaultPeriod,
  calcTenure,
  getCompletionRate,
  getCompletedCount,
  getDuplicateProjectTitles,
  getInProgressCount,
  getProjectsMissingDetailsCount,
  getProjectsWithImpact,
  getTechProjectCount,
  getUniqueTechStack,
  hasInvalidDateRange,
  impactScore,
  impactStrengthClass,
  impactStrengthLabel,
  isDuplicateProjectTitle,
  isProjectDetailsMissing,
  isValidWebsite,
  projectStatusIcon,
  projectStatusLabel,
  PROJECT_STATUSES,
} from '@core/utils/company-metrics';
import { AdminContentStore } from '@core/services/admin-content.store';
import { AdminService } from '@core/services/admin.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ContentService } from '@core/services/content.service';
import { ToastService } from '@shared/components/toast/toast.component';
import { DragListDirective } from '@core/directives/drag-list.directive';

@Component({
  selector: 'app-companies-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, DragListDirective],
  templateUrl: './companies-tab.component.html',
  styleUrls: ['./companies-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompaniesTabComponent implements OnInit, OnDestroy {
  private store = inject(AdminContentStore);
  private adminService = inject(AdminService);
  private contentService = inject(ContentService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  companiesEdit: Company[] = [];
  expandedCompany: string | null = null;
  collapsedProjectRows = new Set<string>();
  showAddCompany = false;
  showAddCompanyProject: string | null = null;
  newCompany: Partial<Company> = this.emptyCompany();
  newCompanyProject: Partial<CompanyProject> = this.emptyCompanyProject();
  companyShortcutsVisible = false;
  autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  autoSavedAt: Date | null = null;
  autoSaving = false;

  // Expose util functions and constants to the template.
  readonly projectStatuses = PROJECT_STATUSES;
  projectStatusLabel = projectStatusLabel;
  projectStatusIcon = projectStatusIcon;
  calcTenure = calcTenure;
  hasInvalidDateRange = hasInvalidDateRange;
  isValidWebsite = isValidWebsite;
  getUniqueTechStack = getUniqueTechStack;
  getTechProjectCount = getTechProjectCount;
  getDuplicateProjectTitles = getDuplicateProjectTitles;
  isDuplicateProjectTitle = isDuplicateProjectTitle;
  isProjectDetailsMissing = isProjectDetailsMissing;
  getProjectsMissingDetailsCount = getProjectsMissingDetailsCount;
  getCompletedCount = getCompletedCount;
  getInProgressCount = getInProgressCount;
  getProjectsWithImpact = getProjectsWithImpact;
  getCompletionRate = getCompletionRate;
  impactScore = impactScore;
  impactStrengthLabel = impactStrengthLabel;
  impactStrengthClass = impactStrengthClass;

  get saving(): boolean {
    return this.store.saving();
  }

  ngOnInit(): void {
    this.companiesEdit = JSON.parse(JSON.stringify(this.store.content()?.companies ?? []));
    this.store.registerSaver('companies', () => this.saveCompanies());
  }

  ngOnDestroy(): void {
    this.store.unregisterSaver('companies');
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  markDirty(): void {
    this.store.markDirty('companies');
  }

  private syncContentCompanies(list: Company[]): void {
    const current = this.store.content();
    if (current) {
      current.companies = JSON.parse(JSON.stringify(list));
      this.store.content.set({ ...current });
    }
  }

  toggleExpandCompany(id: string): void {
    this.expandedCompany = this.expandedCompany === id ? null : id;
  }

  saveCompanies(): void {
    if (this.companiesEdit.some((co) => this.hasInvalidDateRange(co))) {
      this.toast.error('Fix invalid company date ranges before saving.');
      return;
    }

    this.store.saving.set(true);
    this.adminService.updateCompanies(this.companiesEdit).subscribe({
      next: () => {
        this.syncContentCompanies(this.companiesEdit);
        this.store.saving.set(false);
        this.store.clearDirty('companies');
        this.toast.success('Companies saved!');
        this.cdr.markForCheck();
      },
      error: () => {
        this.store.saving.set(false);
        this.toast.error('Save failed');
        this.cdr.markForCheck();
      },
    });
  }

  submitAddCompany(): void {
    this.adminService.addCompany(this.newCompany).subscribe({
      next: (res) => {
        this.companiesEdit.push(res.data);
        this.syncContentCompanies(this.companiesEdit);
        this.showAddCompany = false;
        this.newCompany = this.emptyCompany();
        this.toast.success('Company added!');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Add failed'),
    });
  }

  async deleteCompany(id: string): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete Company',
      message:
        'This will permanently delete the company <strong>and all its projects</strong>. This cannot be undone.',
      confirmText: 'Delete All',
      type: 'danger',
      icon: '⚠️',
    });
    if (!ok) return;
    this.adminService.deleteCompany(id).subscribe({
      next: () => {
        this.companiesEdit = this.companiesEdit.filter((c) => c.id !== id);
        this.syncContentCompanies(this.companiesEdit);
        this.toast.success('Company deleted');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Delete failed'),
    });
  }

  submitAddCompanyProject(companyId: string): void {
    this.adminService.addCompanyProject(companyId, this.newCompanyProject).subscribe({
      next: (res) => {
        const co = this.companiesEdit.find((c) => c.id === companyId);
        if (co) co.projects.push(res.data);
        this.syncContentCompanies(this.companiesEdit);
        this.showAddCompanyProject = null;
        this.newCompanyProject = this.emptyCompanyProject();
        this.toast.success('Project added!');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Add failed'),
    });
  }

  async deleteCompanyProject(companyId: string, projectId: string): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete Project',
      message: 'Are you sure you want to remove this project from the company?',
      confirmText: 'Delete Project',
      type: 'danger',
      icon: '🗑️',
    });
    if (!ok) return;
    this.adminService.deleteCompanyProject(projectId).subscribe({
      next: () => {
        const co = this.companiesEdit.find((c) => c.id === companyId);
        if (co) co.projects = co.projects.filter((p) => p.id !== projectId);
        this.syncContentCompanies(this.companiesEdit);
        this.toast.success('Project deleted');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Delete failed'),
    });
  }

  addCompanyProjectTech(project: CompanyProject, e: Event): void {
    const v = (e.target as HTMLInputElement).value.trim();
    if (v && !project.tech.includes(v)) {
      project.tech.push(v);
      (e.target as HTMLInputElement).value = '';
      this.markDirty();
    }
  }

  removeCompanyProjectTech(p: CompanyProject, tech: string): void {
    p.tech = p.tech.filter((t) => t !== tech);
    this.markDirty();
  }

  isCompanyValid(co: Company): boolean {
    return !!(co.name && co.name.trim() && co.projects.length > 0);
  }

  canSaveCompany(co: Company): boolean {
    return !!(co.name && co.name.trim().length > 0);
  }

  getCompanyProjectCount(co: Company): number {
    return co.projects.length;
  }

  private projectRowKey(companyId: string, projectId: string): string {
    return `${companyId}::${projectId}`;
  }

  toggleProjectCollapsed(companyId: string, projectId: string): void {
    const key = this.projectRowKey(companyId, projectId);
    if (this.collapsedProjectRows.has(key)) this.collapsedProjectRows.delete(key);
    else this.collapsedProjectRows.add(key);
  }

  isProjectCollapsed(companyId: string, projectId: string): boolean {
    return this.collapsedProjectRows.has(this.projectRowKey(companyId, projectId));
  }

  duplicateCompany(co: Company): void {
    const duplicate: Partial<Company> = {
      ...JSON.parse(JSON.stringify(co)),
      name: co.name + ' (Copy)',
      id: 'co_' + Date.now(),
      displayOrder: this.companiesEdit.length,
    };
    this.newCompany = duplicate;
    this.showAddCompany = true;
  }

  moveProjectToCompany(
    projectId: string,
    fromCompanyId: string,
    toCompanyId: string,
  ): void {
    const fromCompany = this.companiesEdit.find((c) => c.id === fromCompanyId);
    const toCompany = this.companiesEdit.find((c) => c.id === toCompanyId);

    if (!fromCompany || !toCompany) return;

    const project = fromCompany.projects.find((p) => p.id === projectId);
    if (!project) return;

    fromCompany.projects = fromCompany.projects.filter((p) => p.id !== projectId);
    toCompany.projects.push(project);
    this.markDirty();
  }

  onCompanyStartDateChange(co: Company): void {
    applyDefaultPeriod(co);
    this.scheduleAutoSave();
  }

  onCompanyEndDateChange(co: Company): void {
    applyDefaultPeriod(co);
    this.scheduleAutoSave();
  }

  onCompanyCurrentToggle(co: Company): void {
    if (co.current) co.endDate = '';
    applyDefaultPeriod(co);
    this.scheduleAutoSave();
  }

  openMonthPicker(e: Event): void {
    const input = e.target as HTMLInputElement | null;
    if (!input || input.type !== 'month' || input.disabled) return;
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    pickerInput.showPicker?.();
  }

  /** Debounced auto-save (3s). Triggers save on any field change. */
  scheduleAutoSave(): void {
    if (this.companiesEdit.some((co) => this.hasInvalidDateRange(co))) return;

    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      this.autoSaving = true;
      this.cdr.markForCheck();
      this.adminService.updateCompanies(this.companiesEdit).subscribe({
        next: () => {
          this.syncContentCompanies(this.companiesEdit);
          this.autoSavedAt = new Date();
          this.autoSaving = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.autoSaving = false;
          this.cdr.markForCheck();
        },
      });
    }, 3000);
  }

  autoSavedLabel(): string {
    if (this.autoSaving) return '⏳ Saving...';
    if (!this.autoSavedAt) return '';
    const diffMs = Date.now() - this.autoSavedAt.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return '✓ Saved just now';
    if (mins === 1) return '✓ Saved 1 min ago';
    return `✓ Saved ${mins} mins ago`;
  }

  exportCompanyJson(co: Company): void {
    const data = JSON.stringify(co, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${co.name.toLowerCase().replace(/\s+/g, '-')}-company.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  copyTechStack(co: Company): void {
    const stack = this.getUniqueTechStack(co).join(', ');
    navigator.clipboard.writeText(stack).then(() => {
      this.toast.success('Tech stack copied!');
    });
  }

  copyResumeSection(co: Company): void {
    const lines = [
      `${co.role} — ${co.name}`,
      co.period,
      '',
      co.description,
      '',
      'Key Projects:',
      ...co.projects.map(
        (p) =>
          `• ${p.title}: ${p.description}${
            p.tech.length ? ` [${p.tech.join(', ')}]` : ''
          }`,
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      this.toast.success('Resume section copied!');
    });
  }

  onReorder(section: string, newIds: string[]): void {
    const orderPayload = newIds.map((id, idx) => ({ id, displayOrder: idx }));
    const reorder = (arr: Company[] | CompanyProject[]) => {
      const map: Record<string, number> = {};
      orderPayload.forEach((o) => (map[o.id] = o.displayOrder));
      const sorted = [...arr].sort(
        (a, b) => (map[a.id] ?? a.displayOrder) - (map[b.id] ?? b.displayOrder),
      );
      sorted.forEach((item, idx) => (item.displayOrder = idx));
      return sorted;
    };
    if (section === 'companies') {
      this.companiesEdit = reorder(this.companiesEdit) as Company[];
    } else if (section.startsWith('company-projects-')) {
      const co = this.companiesEdit.find(
        (c) => c.id === section.replace('company-projects-', ''),
      );
      if (co) co.projects = reorder(co.projects) as CompanyProject[];
    }
    this.contentService.reorder(section, orderPayload).subscribe({
      next: () => this.toast.success('displayOrder saved'),
      error: () => this.toast.error('Reorder failed'),
    });
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

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  // ── Companies-tab keyboard shortcuts (E, A, Shift+?) ────────────────
  @HostListener('keydown.e', ['$event'])
  onKeyE(e: Event): void {
    const t = (e as KeyboardEvent).target as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
    const first = this.companiesEdit[0];
    if (first) this.toggleExpandCompany(first.id);
  }

  @HostListener('keydown.a', ['$event'])
  onKeyA(e: Event): void {
    const t = (e as KeyboardEvent).target as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
    if (this.expandedCompany) this.showAddCompanyProject = this.expandedCompany;
  }

  @HostListener('keydown.shift.?', ['$event'])
  onKeyHelp(e: Event): void {
    const t = (e as KeyboardEvent).target as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
    this.companyShortcutsVisible = !this.companyShortcutsVisible;
  }

  private emptyCompany(): Partial<Company> {
    return {
      name: '',
      role: '',
      period: '',
      location: '',
      logo: '🏢',
      accentColor: '#f5a623',
      current: false,
      description: '',
      projects: [],
      website: '',
      teamSize: '',
      startDate: '',
      endDate: '',
    };
  }

  protected emptyCompanyProject(): Partial<CompanyProject> {
    return {
      title: '',
      description: '',
      tech: [],
      link: '#',
      number: '',
      displayOrder: 0,
      status: null,
      impact: '',
    };
  }
}
