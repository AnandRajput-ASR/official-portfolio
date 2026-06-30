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
import { Testimonial } from '@core/models';
import { AdminContentStore } from '@core/services/admin-content.store';
import { AdminService } from '@core/services/admin.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ContentService } from '@core/services/content.service';
import { ToastService } from '@shared/components/toast/toast.component';
import { DragListDirective } from '@core/directives/drag-list.directive';

@Component({
  selector: 'app-testimonials-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, DragListDirective],
  templateUrl: './testimonials-tab.component.html',
  styleUrls: ['./testimonials-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestimonialsTabComponent implements OnInit, OnDestroy {
  private store = inject(AdminContentStore);
  private adminService = inject(AdminService);
  protected contentService = inject(ContentService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  testimonialsEdit: Testimonial[] = [];
  pendingTestimonials: Testimonial[] = [];
  showAddTestimonial = false;
  testimonialAvatarPreview = '';
  newTestimonial: Partial<Testimonial> = this.emptyTestimonial();

  get saving(): boolean {
    return this.store.saving();
  }

  ngOnInit(): void {
    this.testimonialsEdit = JSON.parse(JSON.stringify(this.store.content()?.testimonials ?? []));
    this.store.registerSaver('testimonials', () => this.saveTestimonials());
    this.loadPendingTestimonials();
  }

  ngOnDestroy(): void {
    this.store.unregisterSaver('testimonials');
  }

  markDirty(): void {
    this.store.markDirty('testimonials');
  }

  private syncTestimonials(list: Testimonial[]): void {
    const current = this.store.content();
    if (current) {
      current.testimonials = JSON.parse(JSON.stringify(list));
      this.store.content.set({ ...current });
    }
  }

  loadPendingTestimonials(): void {
    this.adminService.getAllTestimonials().subscribe({
      next: (res) => {
        this.testimonialsEdit = res.approved;
        this.pendingTestimonials = res.pending;
        this.store.pendingTestimonials.set(res.pending);
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Failed to load pending testimonials');
      },
    });
  }

  saveTestimonials(): void {
    this.store.saving.set(true);
    this.adminService.updateTestimonials(this.testimonialsEdit).subscribe({
      next: () => {
        this.syncTestimonials(this.testimonialsEdit);
        this.store.saving.set(false);
        this.store.clearDirty('testimonials');
        this.toast.success('Testimonials saved!');
        this.cdr.markForCheck();
      },
      error: () => {
        this.store.saving.set(false);
        this.toast.error('Save failed');
        this.cdr.markForCheck();
      },
    });
  }

  toggleTestimonialVisible(t: Testimonial): void {
    t.visible = !t.visible;
    this.cdr.markForCheck();
    this.adminService.updateTestimonial(t.id, { visible: t.visible }).subscribe({
      next: () =>
        this.toast.success(t.visible ? 'Now visible on portfolio' : 'Hidden from portfolio'),
      error: () => this.toast.error('Toggle failed'),
    });
  }

  submitAddTestimonial(): void {
    const t: Testimonial = {
      id: 't_' + Date.now(),
      name: this.newTestimonial.name || '',
      role: this.newTestimonial.role || '',
      company: this.newTestimonial.company || '',
      avatar: this.testimonialAvatarPreview || '',
      quote: this.newTestimonial.quote || '',
      rating: this.newTestimonial.rating || 5,
      visible: true,
      displayOrder: this.testimonialsEdit.length,
      status: 'approved',
    };
    this.adminService.addTestimonial(t).subscribe({
      next: (res) => {
        this.testimonialsEdit.push(res.data || t);
        this.syncTestimonials(this.testimonialsEdit);
        this.showAddTestimonial = false;
        this.newTestimonial = this.emptyTestimonial();
        this.testimonialAvatarPreview = '';
        this.toast.success('Testimonial added!');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Add failed'),
    });
  }

  async deleteTestimonial(id: string): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete Testimonial',
      message: 'Are you sure you want to permanently delete this testimonial?',
      confirmText: 'Delete',
      type: 'danger',
      icon: '💬',
    });
    if (!ok) return;
    this.testimonialsEdit = this.testimonialsEdit.filter((t) => t.id !== id);
    this.cdr.markForCheck();
    this.adminService.deleteTestimonial(id).subscribe({
      next: () => {
        this.syncTestimonials(this.testimonialsEdit);
        this.toast.success('Testimonial deleted');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Delete failed'),
    });
  }

  approveTestimonial(t: Testimonial): void {
    this.adminService.approveTestimonial(t.id).subscribe({
      next: (res) => {
        this.pendingTestimonials = this.pendingTestimonials.filter((p) => p.id !== t.id);
        this.store.pendingTestimonials.set(this.pendingTestimonials);
        this.testimonialsEdit.push({ ...t, ...(res.data || {}) });
        this.syncTestimonials(this.testimonialsEdit);
        this.toast.success(`Approved! "${t.name}" is now visible.`);
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Approve failed'),
    });
  }

  rejectTestimonial(t: Testimonial): void {
    this.adminService.rejectTestimonial(t.id).subscribe({
      next: () => {
        t.status = 'rejected';
        this.toast.info(`"${t.name}" marked as rejected.`);
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Reject failed'),
    });
  }

  async deletePendingTestimonial(id: string): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete Submission',
      message: 'Permanently delete this pending testimonial submission?',
      confirmText: 'Delete',
      type: 'danger',
      icon: '🗑️',
    });
    if (!ok) return;
    this.pendingTestimonials = this.pendingTestimonials.filter((t) => t.id !== id);
    this.store.pendingTestimonials.set(this.pendingTestimonials);
    this.cdr.markForCheck();
    this.adminService.deletePendingTestimonial(id).subscribe({
      next: () => this.toast.success('Deleted'),
      error: () => this.toast.error('Delete failed'),
    });
  }

  onAvatarUpload(t: Partial<Testimonial>, e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      if (t === this.newTestimonial) this.testimonialAvatarPreview = dataUrl;
      this.contentService.uploadImage(file.name, base64).subscribe({
        next: ({ url }) => {
          t.avatar = url;
          if (t === this.newTestimonial) this.testimonialAvatarPreview = url;
          this.cdr.markForCheck();
        },
        error: () => {
          t.avatar = dataUrl;
          this.cdr.markForCheck();
        },
      });
    };
    r.readAsDataURL(file);
  }

  onReorder(newIds: string[]): void {
    const orderPayload = newIds.map((id, idx) => ({ id, displayOrder: idx }));
    const map: Record<string, number> = {};
    orderPayload.forEach((o) => (map[o.id] = o.displayOrder));
    const sorted = [...this.testimonialsEdit].sort(
      (a, b) => (map[a.id] ?? a.displayOrder) - (map[b.id] ?? b.displayOrder),
    );
    sorted.forEach((item, idx) => (item.displayOrder = idx));
    this.testimonialsEdit = sorted;
    this.contentService.reorder('testimonials', orderPayload).subscribe({
      next: () => this.toast.success('displayOrder saved'),
      error: () => this.toast.error('Reorder failed'),
    });
  }

  ratingStars(n: number): number[] {
    return Array(n).fill(0);
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  private emptyTestimonial(): Partial<Testimonial> {
    return {
      name: '',
      role: '',
      company: '',
      avatar: '',
      quote: '',
      rating: 5,
      visible: true,
      status: 'approved',
    };
  }
}
