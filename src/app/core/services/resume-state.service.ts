import { Injectable, inject, signal } from '@angular/core';
import { ResumeInfo, ResumeService } from './resume.service';

/**
 * Shared resume availability state. Lets the dashboard sidebar (resume dot) and
 * the extracted resume tab stay in sync without prop drilling, since the tab is
 * only instantiated lazily via *ngIf.
 */
@Injectable({ providedIn: 'root' })
export class ResumeStateService {
  private readonly resumeService = inject(ResumeService);

  readonly info = signal<ResumeInfo | null>(null);

  load(): void {
    this.resumeService.getInfo().subscribe({
      next: (i) => this.info.set(i),
      error: () => {},
    });
  }

  set(info: ResumeInfo | null): void {
    this.info.set(info);
  }
}
