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
import { PersonalProject } from '@core/models';
import { AdminContentStore } from '@core/services/admin-content.store';
import { AdminService } from '@core/services/admin.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ContentService } from '@core/services/content.service';
import { ToastService } from '@shared/components/toast/toast.component';
import { DragListDirective } from '@core/directives/drag-list.directive';

@Component({
  selector: 'app-personal-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, DragListDirective],
  templateUrl: './personal-tab.component.html',
  styleUrls: ['./personal-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalTabComponent implements OnInit, OnDestroy {
  private store = inject(AdminContentStore);
  private adminService = inject(AdminService);
  private contentService = inject(ContentService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  personalProjectsEdit: PersonalProject[] = [];
  showAddPersonal = false;
  newPersonal: Partial<PersonalProject> = this.emptyPersonal();

  get saving(): boolean {
    return this.store.saving();
  }

  ngOnInit(): void {
    this.personalProjectsEdit = JSON.parse(
      JSON.stringify(this.store.content()?.personalProjects ?? []),
    );
    this.store.registerSaver('personal', () => this.savePersonalProjects());
  }

  ngOnDestroy(): void {
    this.store.unregisterSaver('personal');
  }

  markDirty(): void {
    this.store.markDirty('personal');
  }

  savePersonalProjects(): void {
    this.store.saving.set(true);
    this.adminService.updatePersonalProjects(this.personalProjectsEdit).subscribe({
      next: () => {
        const current = this.store.content();
        if (current) {
          current.personalProjects = JSON.parse(JSON.stringify(this.personalProjectsEdit));
          this.store.content.set({ ...current });
        }
        this.store.saving.set(false);
        this.store.clearDirty('personal');
        this.toast.success('Projects saved!');
        this.cdr.markForCheck();
      },
      error: () => {
        this.store.saving.set(false);
        this.toast.error('Save failed');
        this.cdr.markForCheck();
      },
    });
  }

  submitAddPersonal(): void {
    const project: PersonalProject = {
      id: 'pp_' + Date.now(),
      title: this.newPersonal.title || '',
      description: this.newPersonal.description || '',
      tech: this.newPersonal.tech || [],
      githubUrl: this.newPersonal.githubUrl || '#',
      liveUrl: this.newPersonal.liveUrl || '#',
      status: (this.newPersonal.status as PersonalProject['status']) || 'wip',
      type: (this.newPersonal.type as PersonalProject['type']) || 'personal',
      featured: this.newPersonal.featured || false,
      year: this.newPersonal.year || String(new Date().getFullYear()),
      displayOrder: this.personalProjectsEdit.length,
    };
    this.adminService.addPersonalProject(project).subscribe({
      next: (res) => {
        this.personalProjectsEdit.push(res.data || project);
        const current = this.store.content();
        if (current) {
          current.personalProjects = JSON.parse(JSON.stringify(this.personalProjectsEdit));
          this.store.content.set({ ...current });
        }
        this.showAddPersonal = false;
        this.newPersonal = this.emptyPersonal();
        this.toast.success('Project added!');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Add failed'),
    });
  }

  async deletePersonalProject(id: string): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete Project',
      message: 'Are you sure you want to delete this personal project?',
      confirmText: 'Delete',
      type: 'danger',
      icon: '🗑️',
    });
    if (!ok) return;
    this.personalProjectsEdit = this.personalProjectsEdit.filter((p) => p.id !== id);
    this.cdr.markForCheck();
    this.adminService.deletePersonalProject(id).subscribe({
      next: () => {
        const current = this.store.content();
        if (current) {
          current.personalProjects = JSON.parse(JSON.stringify(this.personalProjectsEdit));
          this.store.content.set({ ...current });
        }
        this.toast.success('Project deleted');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Delete failed'),
    });
  }

  addPersonalTech(project: PersonalProject | Partial<PersonalProject>, e: Event): void {
    const v = (e.target as HTMLInputElement).value.trim();
    if (!project.tech) project.tech = [];
    if (v && !project.tech.includes(v)) {
      project.tech.push(v);
      (e.target as HTMLInputElement).value = '';
      this.markDirty();
    }
  }

  removePersonalTech(project: PersonalProject | Partial<PersonalProject>, tech: string): void {
    if (project.tech) {
      project.tech = project.tech.filter((t) => t !== tech);
      this.markDirty();
    }
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

  onReorder(newIds: string[]): void {
    const orderPayload = newIds.map((id, idx) => ({ id, displayOrder: idx }));
    const map: Record<string, number> = {};
    orderPayload.forEach((o) => (map[o.id] = o.displayOrder));
    const sorted = [...this.personalProjectsEdit].sort(
      (a, b) => (map[a.id] ?? a.displayOrder) - (map[b.id] ?? b.displayOrder),
    );
    sorted.forEach((item, idx) => (item.displayOrder = idx));
    this.personalProjectsEdit = sorted;
    this.contentService.reorder('personalProjects', orderPayload).subscribe({
      next: () => this.toast.success('displayOrder saved'),
      error: () => this.toast.error('Reorder failed'),
    });
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  private emptyPersonal(): Partial<PersonalProject> {
    return {
      title: '',
      description: '',
      tech: [],
      githubUrl: '#',
      liveUrl: '#',
      status: 'wip',
      type: 'personal',
      featured: false,
      year: String(new Date().getFullYear()),
    };
  }
}
