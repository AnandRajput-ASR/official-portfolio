import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResponse } from '@core/models';
import { AuditLogService } from '@core/services/audit-log.service';
import { environment } from '@env/environment';
import { map, Observable, tap } from 'rxjs';

export interface ResumeInfo {
  available: boolean;
  fileName?: string;
  downloadName?: string;
  uploadedAt?: string;
  size?: number;
  version?: number;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string | null;
  is_deleted?: boolean;
  singleton_key?: string;
}

export interface UploadProgress {
  type: 'progress' | 'complete' | 'error';
  percent?: number;
  result?: { message: string; fileName: string; size: number };
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ResumeService {
  private http = inject(HttpClient);
  private audit = inject(AuditLogService);

  private base = `${environment.api.baseUrl}/resume`;

  getInfo(): Observable<ResumeInfo> {
    return this.http
      .get<unknown>(`${this.base}/info`)
      .pipe(map((res) => this.normalizeResumeInfo(res)));
  }

  getDownloadUrl(): string {
    return `${this.base}/download`;
  }

  updateDownloadName(downloadName: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.base}/download-name`, { downloadName });
  }

  /**
   * Upload resume with real XHR progress tracking.
   * Emits { type:'progress', percent } → { type:'complete', result } | { type:'error', error }
   */
  uploadResumeWithProgress(file: File): Observable<UploadProgress> {
    return new Observable((observer) => {
      const reader = new FileReader();
      let uploadSubscription: { unsubscribe: () => void } | null = null;

      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        uploadSubscription = this.http
          .post<{
            message: string;
            fileName: string;
            size: number;
          }>(`${this.base}/upload`, { fileName: file.name, fileData: base64, fileSize: file.size }, { observe: 'events', reportProgress: true })
          .subscribe({
            next: (event) => {
              if (event.type === HttpEventType.UploadProgress) {
                const total = event.total || file.size;
                const percent = total ? Math.round((event.loaded / total) * 100) : 0;
                observer.next({ type: 'progress', percent });
              } else if (event instanceof HttpResponse) {
                this.audit.log('resume', 'upload', `Uploaded resume: ${file.name}`);
                observer.next({
                  type: 'complete',
                  result: event.body ?? {
                    message: 'Upload complete',
                    fileName: file.name,
                    size: file.size,
                  },
                });
                observer.complete();
              }
            },
            error: (err) => {
              observer.next({
                type: 'error',
                error: err?.error?.message || err?.message || 'Upload failed',
              });
              observer.complete();
            },
          });
      };

      reader.onerror = () => {
        observer.next({ type: 'error', error: 'Failed to read file' });
        observer.complete();
      };

      reader.readAsDataURL(file);

      return () => uploadSubscription?.unsubscribe();
    });
  }

  deleteResume(): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(this.base)
      .pipe(tap(() => this.audit.log('resume', 'delete', 'Deleted resume')));
  }

  formatSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private normalizeResumeInfo(rawInfo: unknown): ResumeInfo {
    const payload =
      rawInfo && typeof rawInfo === 'object' && !Array.isArray(rawInfo) && 'data' in rawInfo
        ? (rawInfo as { data?: unknown }).data
        : rawInfo;
    const candidate = Array.isArray(payload)
      ? payload.find((entry) => (entry as { is_deleted?: boolean })?.is_deleted !== true) ?? payload[0]
      : payload;

    const normalized = (candidate as ResumeInfo) ?? { available: false };
    if (normalized.is_deleted === true) return { available: false };
    return normalized;
  }
}
