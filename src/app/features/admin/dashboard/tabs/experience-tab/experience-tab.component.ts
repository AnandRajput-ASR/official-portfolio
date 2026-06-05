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
import { Experience } from '@core/models';
import { AdminContentStore } from '@core/services/admin-content.store';
import { AdminService } from '@core/services/admin.service';
import { ContentService } from '@core/services/content.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@shared/components/toast/toast.component';
import { DragListDirective } from '@core/directives/drag-list.directive';

@Component({
  selector: 'app-experience-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, DragListDirective],
  templateUrl: './experience-tab.component.html',
  styleUrls: ['./experience-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperienceTabComponent implements OnInit, OnDestroy {
  private store = inject(AdminContentStore);
  private adminService = inject(AdminService);
  private contentService = inject(ContentService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  experienceEdit: Experience[] = [];
  showAddExp = false;
  newExp: Partial<Experience> = this.emptyExp();

  get saving(): boolean {
    return this.store.saving();
  }

  ngOnInit(): void {
    this.experienceEdit = JSON.parse(JSON.stringify(this.store.content()?.experience ?? []));
    this.store.registerSaver('experience', () => this.saveExperience());
  }

  ngOnDestroy(): void {
    this.store.unregisterSaver('experience');
  }

  markDirty(): void {
    this.store.markDirty('experience');
  }

  saveExperience(): void {
    this.store.saving.set(true);
    this.adminService.updateExperience(this.experienceEdit).subscribe({
      next: () => {
        const current = this.store.content();
        if (current) {
          current.experience = JSON.parse(JSON.stringify(this.experienceEdit));
          this.store.content.set({ ...current });
        }
        this.store.saving.set(false);
        this.store.clearDirty('experience');
        this.toast.success('Experience saved!');
        this.cdr.markForCheck();
      },
      error: () => {
        this.store.saving.set(false);
        this.toast.error('Save failed');
        this.cdr.markForCheck();
      },
    });
  }

  async deleteExperience(id: string): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete Entry',
      message: 'Remove this experience/education entry from the timeline?',
      confirmText: 'Delete',
      type: 'danger',
      icon: '🗑️',
    });
    if (!ok) return;
    this.experienceEdit = this.experienceEdit.filter((e) => e.id !== id);
    this.cdr.markForCheck();
    this.adminService.deleteExperience(id).subscribe({
      next: () => {
        const current = this.store.content();
        if (current) {
          current.experience = JSON.parse(JSON.stringify(this.experienceEdit));
          this.store.content.set({ ...current });
        }
        this.toast.success('Entry deleted');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Delete failed'),
    });
  }

  submitAddExp(): void {
    const exp: Experience = {
      id: `exp_${Date.now()}`,
      period: this.newExp.period || '',
      role: this.newExp.role || '',
      company: this.newExp.company || '',
      location: this.newExp.location || '',
      description: this.newExp.description || '',
      displayOrder: this.experienceEdit.length,
    };
    this.adminService.addExperience(exp).subscribe({
      next: (res) => {
        this.experienceEdit.push(res.data || exp);
        const current = this.store.content();
        if (current) {
          current.experience = JSON.parse(JSON.stringify(this.experienceEdit));
          this.store.content.set({ ...current });
        }
        this.showAddExp = false;
        this.newExp = this.emptyExp();
        this.toast.success('Experience added!');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Add failed'),
    });
  }

  onReorder(newIds: string[]): void {
    const orderPayload = newIds.map((id, idx) => ({ id, displayOrder: idx }));
    const map: Record<string, number> = {};
    orderPayload.forEach((o) => (map[o.id] = o.displayOrder));
    const sorted = [...this.experienceEdit].sort(
      (a, b) => (map[a.id] ?? a.displayOrder) - (map[b.id] ?? b.displayOrder),
    );
    sorted.forEach((item, idx) => (item.displayOrder = idx));
    this.experienceEdit = sorted;
    this.contentService.reorder('experience', orderPayload).subscribe({
      next: () => this.toast.success('displayOrder saved'),
      error: () => this.toast.error('Reorder failed'),
    });
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  private emptyExp(): Partial<Experience> {
    return { period: '', role: '', company: '', location: '', description: '' };
  }
}
