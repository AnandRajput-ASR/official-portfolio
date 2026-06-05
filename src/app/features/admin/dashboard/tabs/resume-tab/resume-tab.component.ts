import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ResumeStateService } from '@core/services/resume-state.service';
import { ResumeService, UploadProgress } from '@core/services/resume.service';
import { ToastService } from '@shared/components/toast/toast.component';

@Component({
  selector: 'app-resume-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resume-tab.component.html',
  styleUrl: './resume-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumeTabComponent {
  readonly resumeService = inject(ResumeService);
  readonly resumeState = inject(ResumeStateService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  resumeDownloadName = '';
  resumeDownloadNameSaving = false;
  resumeDragOver = false;
  uploadProgress = 0;
  uploadState: 'idle' | 'reading' | 'uploading' | 'done' | 'error' = 'idle';
  uploadErrorMsg = '';

  get resumeInfo() {
    return this.resumeState.info();
  }

  onResumeFileSelected(e: Event): void {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) this.uploadResume(f);
    (e.target as HTMLInputElement).value = '';
  }

  onResumeDrop(e: DragEvent): void {
    e.preventDefault();
    this.resumeDragOver = false;
    const f = e.dataTransfer?.files?.[0];
    if (f) this.uploadResume(f);
  }

  uploadResume(file: File): void {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      this.toast.error('Only PDF files allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.toast.error('Max 10MB allowed.');
      return;
    }
    this.uploadState = 'reading';
    this.uploadProgress = 0;
    this.uploadErrorMsg = '';
    this.resumeService.uploadResumeWithProgress(file, this.auth.getToken() || '').subscribe({
      next: (ev: UploadProgress) => {
        if (ev.type === 'progress') {
          this.uploadState = 'uploading';
          this.uploadProgress = ev.percent ?? 0;
        } else if (ev.type === 'complete') {
          this.uploadState = 'done';
          this.uploadProgress = 100;
          this.resumeState.load();
          this.toast.success('Resume uploaded!');
          setTimeout(() => {
            this.uploadState = 'idle';
            this.uploadProgress = 0;
          }, 2500);
        } else if (ev.type === 'error') {
          this.uploadState = 'error';
          this.uploadErrorMsg = ev.error || 'Upload failed';
          this.toast.error(this.uploadErrorMsg);
        }
      },
    });
  }

  async deleteResume(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Remove Resume',
      message: 'Visitors will no longer see a download button. You can re-upload at any time.',
      confirmText: 'Remove',
      type: 'warning',
      icon: '📄',
    });
    if (!ok) return;
    this.resumeService.deleteResume().subscribe({
      next: () => {
        this.resumeState.set({ available: false });
        this.toast.success('Resume removed.');
      },
      error: () => this.toast.error('Delete failed'),
    });
  }

  saveDownloadName(): void {
    this.resumeDownloadNameSaving = true;
    this.resumeService.updateDownloadName(this.resumeDownloadName).subscribe({
      next: () => {
        this.resumeDownloadNameSaving = false;
        const current = this.resumeState.info();
        if (current) {
          this.resumeState.set({ ...current, downloadName: this.resumeDownloadName || undefined });
        }
        this.toast.success('Download name saved!');
      },
      error: () => {
        this.resumeDownloadNameSaving = false;
        this.toast.error('Save failed');
      },
    });
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso),
      now = new Date();
    const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
