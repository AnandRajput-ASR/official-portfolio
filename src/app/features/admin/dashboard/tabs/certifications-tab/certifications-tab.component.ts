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
import { Certification } from '@core/models';
import { AdminContentStore } from '@core/services/admin-content.store';
import { AdminService } from '@core/services/admin.service';
import { CertBadgeService } from '@core/services/cert-badge.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ContentService } from '@core/services/content.service';
import { LoadingService } from '@core/services/loading.service';
import { CertificationBadgeComponent } from '@shared/components/certification-badge/certification-badge.component';
import { ToastService } from '@shared/components/toast/toast.component';
import { DragListDirective } from '@core/directives/drag-list.directive';

@Component({
  selector: 'app-certifications-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, DragListDirective, CertificationBadgeComponent],
  templateUrl: './certifications-tab.component.html',
  styleUrls: ['./certifications-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificationsTabComponent implements OnInit, OnDestroy {
  private store = inject(AdminContentStore);
  private adminService = inject(AdminService);
  protected certBadge = inject(CertBadgeService);
  private contentService = inject(ContentService);
  private loadingService = inject(LoadingService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  certificationsEdit: Certification[] = [];
  certificationsFullEdit = false;
  showAddCert = false;
  newCert: Partial<Certification> = this.emptyCert();
  certUploadPreview = '';

  /** URLs uploaded in this session that aren't yet persisted. Cleaned up
   *  on destroy and after every save. */
  private pendingCertUploadUrls = new Set<string>();
  /** Per-cert background-removal in-flight markers (for the spinner). */
  private badgeBgRemovalRunning = new Set<string>();

  get saving(): boolean {
    return this.store.saving();
  }

  ngOnInit(): void {
    this.certificationsEdit = JSON.parse(
      JSON.stringify(this.store.content()?.certifications ?? []),
    );
    this.store.registerSaver('certifications', () => this.saveCertifications());
  }

  ngOnDestroy(): void {
    this.store.unregisterSaver('certifications');
    this.cleanupUnusedPendingCertUploads();
  }

  markDirty(): void {
    this.store.markDirty('certifications');
  }

  private syncContentCerts(certs: Certification[]): void {
    const current = this.store.content();
    if (current) {
      current.certifications = JSON.parse(JSON.stringify(certs));
      this.store.content.set({ ...current });
    }
  }

  saveCertifications(): void {
    const loaderKey = 'admin-certifications-save';
    const invalidCertification = this.certificationsEdit.find(
      (certification) => !this.isCertificationYearRangeValid(certification),
    );
    if (invalidCertification) {
      this.toast.error(
        `Check years for ${invalidCertification.code || invalidCertification.name}`,
      );
      return;
    }

    const previousCertifications = JSON.parse(
      JSON.stringify(this.store.content()?.certifications || []),
    ) as Certification[];
    this.store.saving.set(true);
    this.loadingService.start(loaderKey);
    this.adminService.updateCertifications(this.certificationsEdit).subscribe({
      next: () => {
        this.deleteRemovedSavedCertUploads(previousCertifications, this.certificationsEdit);
        this.releaseSavedCertUploads(this.certificationsEdit);
        this.syncContentCerts(this.certificationsEdit);
        this.store.saving.set(false);
        this.loadingService.stop(loaderKey);
        this.store.clearDirty('certifications');
        this.toast.success('Certifications saved!');
        this.cdr.markForCheck();
      },
      error: () => {
        this.store.saving.set(false);
        this.loadingService.stop(loaderKey);
        this.toast.error('Save failed');
        this.cdr.markForCheck();
      },
    });
  }

  submitAddCert(): void {
    const cert: Certification = {
      id: `cert_${Date.now()}`,
      name: this.newCert.name || '',
      code: this.newCert.code || '',
      issuer: this.newCert.issuer || '',
      level: this.newCert.level || 'Associate',
      credlyLink: this.newCert.credlyLink || '',
      badgeLink: this.certUploadPreview || this.newCert.badgeLink || '',
      badgeType: (this.newCert.badgeType || 'auto') as Certification['badgeType'],
      accentColor: this.newCert.accentColor || '#0078d4',
      issueYear: this.newCert.issueYear || String(new Date().getFullYear()),
      expirationYear: this.newCert.expirationYear || '',
      displayOrder: this.certificationsEdit.length,
    };

    if (!this.isCertificationYearRangeValid(cert)) {
      this.toast.error('Please enter valid issued/expiry years (expiry must be after issued).');
      return;
    }

    this.adminService.addCertification(cert).subscribe({
      next: (res) => {
        const saved = res.data || cert;
        this.certificationsEdit.push(saved);
        this.releaseSavedCertUploads([saved]);
        this.syncContentCerts(this.certificationsEdit);
        this.showAddCert = false;
        this.newCert = this.emptyCert();
        this.certUploadPreview = '';
        this.toast.success('Certification added!');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Add failed'),
    });
  }

  async deleteCert(id: string): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete Certification',
      message: 'Remove this certification from your portfolio?',
      confirmText: 'Delete',
      type: 'danger',
      icon: '🏅',
    });
    if (!ok) return;
    const deletedCert = this.certificationsEdit.find((c) => c.id === id);
    this.certificationsEdit = this.certificationsEdit.filter((c) => c.id !== id);
    this.cdr.markForCheck();
    this.adminService.deleteCertification(id).subscribe({
      next: () => {
        if (deletedCert?.badgeLink) this.cleanupUploadedCertImage(deletedCert.badgeLink);
        this.syncContentCerts(this.certificationsEdit);
        this.toast.success('Certification deleted');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Delete failed'),
    });
  }

  triggerFileInput(certId: string): void {
    const input = document.getElementById(`badge-upload-${certId}`) as HTMLInputElement;
    input?.click();
  }

  closeAddCertModal(): void {
    this.showAddCert = false;
    this.newCert = this.emptyCert();
    this.certUploadPreview = '';
    this.cleanupUnusedPendingCertUploads();
  }

  onCertBadgeUpload(cert: Partial<Certification>, e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const previousBadgeLink = cert.badgeLink || '';
    const idx = this.certificationsEdit.findIndex((item) => item.id === cert.id);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(',')[1];

      cert.badgeType = 'upload';
      cert.badgeLink = dataUrl;
      if (idx !== -1) {
        this.certificationsEdit[idx] = {
          ...this.certificationsEdit[idx],
          badgeType: 'upload',
          badgeLink: dataUrl,
        };
      }
      if (cert === this.newCert) this.certUploadPreview = dataUrl;
      this.markDirty();
      this.cdr.markForCheck();

      this.contentService.uploadImage(file.name, base64).subscribe({
        next: ({ url }) => {
          cert.badgeLink = url;
          this.pendingCertUploadUrls.add(url);
          if (this.pendingCertUploadUrls.has(previousBadgeLink)) {
            this.cleanupUploadedCertImage(previousBadgeLink);
          }
          if (idx !== -1) {
            this.certificationsEdit[idx] = {
              ...this.certificationsEdit[idx],
              badgeType: 'upload',
              badgeLink: url,
            };
          }
          if (cert === this.newCert) this.certUploadPreview = url;
          this.cdr.markForCheck();
        },
        error: () => {
          cert.badgeLink = dataUrl;
          if (this.pendingCertUploadUrls.has(previousBadgeLink)) {
            this.cleanupUploadedCertImage(previousBadgeLink);
          }
          this.toast.error('Image upload failed — using local preview only');
        },
      });
    };
    reader.readAsDataURL(file);
  }

  setBadgeType(cert: Partial<Certification>, type: 'auto' | 'upload' | 'default'): void {
    const previousBadgeLink = cert.badgeLink || '';
    cert.badgeType = type;
    if (type !== 'upload') {
      cert.badgeLink = '';
      if (cert === this.newCert) this.certUploadPreview = '';
      if (this.pendingCertUploadUrls.has(previousBadgeLink)) {
        this.cleanupUploadedCertImage(previousBadgeLink);
      }
    }
    const idx = this.certificationsEdit.findIndex((c) => c.id === cert.id);
    if (idx !== -1) {
      this.certificationsEdit[idx] = {
        ...this.certificationsEdit[idx],
        badgeType: type,
        badgeLink: type !== 'upload' ? '' : cert.badgeLink || '',
      };
    }
    this.markDirty();
  }

  isBgRemovalRunning(cert: Partial<Certification>): boolean {
    return this.badgeBgRemovalRunning.has(this.badgeProcessingKey(cert));
  }

  async removeUploadedBadgeBackground(cert: Partial<Certification>): Promise<void> {
    const source =
      cert === this.newCert ? this.certUploadPreview || cert.badgeLink || '' : cert.badgeLink || '';
    if (!source) {
      this.toast.info('Upload a badge image first.');
      return;
    }

    const key = this.badgeProcessingKey(cert);
    if (this.badgeBgRemovalRunning.has(key)) return;
    this.badgeBgRemovalRunning.add(key);

    const previousBadgeLink = cert.badgeLink || '';
    const idx = this.certificationsEdit.findIndex((item) => item.id === cert.id);

    try {
      const processedDataUrl = await this.removeBackgroundToPng(source);
      const base64 = processedDataUrl.split(',')[1];

      cert.badgeType = 'upload';
      cert.badgeLink = processedDataUrl;
      if (idx !== -1) {
        this.certificationsEdit[idx] = {
          ...this.certificationsEdit[idx],
          badgeType: 'upload',
          badgeLink: processedDataUrl,
        };
      }
      if (cert === this.newCert) this.certUploadPreview = processedDataUrl;
      this.markDirty();
      this.cdr.markForCheck();

      this.contentService.uploadImage(`cert-badge-${Date.now()}.png`, base64).subscribe({
        next: ({ url }) => {
          cert.badgeLink = url;
          this.pendingCertUploadUrls.add(url);
          if (this.pendingCertUploadUrls.has(previousBadgeLink)) {
            this.cleanupUploadedCertImage(previousBadgeLink);
          }
          if (idx !== -1) {
            this.certificationsEdit[idx] = {
              ...this.certificationsEdit[idx],
              badgeType: 'upload',
              badgeLink: url,
            };
          }
          if (cert === this.newCert) this.certUploadPreview = url;
          this.badgeBgRemovalRunning.delete(key);
          this.toast.success('Background removed');
          this.cdr.markForCheck();
        },
        error: () => {
          this.badgeBgRemovalRunning.delete(key);
          this.toast.info('Background preview applied locally. Save to keep it.');
          this.cdr.markForCheck();
        },
      });
    } catch {
      this.badgeBgRemovalRunning.delete(key);
      this.toast.error('Could not remove background from this image.');
      this.cdr.markForCheck();
    }
  }

  onIssuerChange(cert: Partial<Certification>): void {
    // Always update the issuer color when the issuer changes — no legacy
    // "is the current color still the default orange?" check.
    cert.accentColor = this.certBadge.getIssuerColor(cert.issuer || '');
    if (this.certBadge.isKnownIssuer(cert.issuer || '')) {
      if (cert.badgeType !== 'upload') cert.badgeType = 'auto';
    } else {
      if (cert.badgeType === 'auto') cert.badgeType = 'default';
    }
    this.markDirty();
  }

  onLevelChange(cert: Partial<Certification>): void {
    cert.accentColor = this.certBadge.getLevelColor(cert.level || '');
    this.markDirty();
  }

  onReorder(newIds: string[]): void {
    const orderPayload = newIds.map((id, idx) => ({ id, displayOrder: idx }));
    const map: Record<string, number> = {};
    orderPayload.forEach((o) => (map[o.id] = o.displayOrder));
    const sorted = [...this.certificationsEdit].sort(
      (a, b) => (map[a.id] ?? a.displayOrder) - (map[b.id] ?? b.displayOrder),
    );
    sorted.forEach((item, idx) => (item.displayOrder = idx));
    this.certificationsEdit = sorted;
    this.contentService.reorder('certifications', orderPayload).subscribe({
      next: () => this.toast.success('displayOrder saved'),
      error: () => this.toast.error('Reorder failed'),
    });
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  private emptyCert(): Partial<Certification> {
    return {
      name: '',
      code: '',
      issuer: 'Microsoft',
      level: 'Associate',
      credlyLink: '',
      badgeLink: '',
      badgeType: 'auto',
      accentColor: '#0078d4',
      issueYear: String(new Date().getFullYear()),
      expirationYear: '',
    };
  }

  private badgeProcessingKey(cert: Partial<Certification>): string {
    return cert.id || 'new-cert';
  }

  private removeBackgroundToPng(source: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';

      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }

          ctx.drawImage(image, 0, 0);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = frame.data;
          const width = canvas.width;
          const height = canvas.height;

          const corners = [
            this.pixelAt(data, width, 0, 0),
            this.pixelAt(data, width, width - 1, 0),
            this.pixelAt(data, width, 0, height - 1),
            this.pixelAt(data, width, width - 1, height - 1),
          ];
          const bg = this.averagePixel(corners);

          const visited = new Uint8Array(width * height);
          const queue: [number, number][] = [];
          for (let x = 0; x < width; x++) {
            queue.push([x, 0], [x, height - 1]);
          }
          for (let y = 0; y < height; y++) {
            queue.push([0, y], [width - 1, y]);
          }

          const tolerance = 40;
          while (queue.length) {
            const [x, y] = queue.shift() as [number, number];
            const index = y * width + x;
            if (visited[index]) continue;
            visited[index] = 1;

            const rgba = this.pixelAt(data, width, x, y);
            const nearBackground =
              Math.abs(rgba[0] - bg[0]) <= tolerance &&
              Math.abs(rgba[1] - bg[1]) <= tolerance &&
              Math.abs(rgba[2] - bg[2]) <= tolerance &&
              rgba[3] > 0;

            if (!nearBackground) continue;

            const offset = (y * width + x) * 4;
            data[offset + 3] = 0;

            if (x > 0) queue.push([x - 1, y]);
            if (x < width - 1) queue.push([x + 1, y]);
            if (y > 0) queue.push([x, y - 1]);
            if (y < height - 1) queue.push([x, y + 1]);
          }

          ctx.putImageData(frame, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (processingError) {
          reject(processingError);
        }
      };

      image.onerror = () => reject(new Error('Image load failed'));
      image.src = this.contentService.getImageUrl(source);
    });
  }

  private pixelAt(
    data: Uint8ClampedArray,
    width: number,
    x: number,
    y: number,
  ): [number, number, number, number] {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  }

  private averagePixel(
    samples: [number, number, number, number][],
  ): [number, number, number, number] {
    const sum = samples.reduce(
      (acc, s) => [acc[0] + s[0], acc[1] + s[1], acc[2] + s[2], acc[3] + s[3]],
      [0, 0, 0, 0],
    );
    const n = samples.length || 1;
    return [
      Math.round(sum[0] / n),
      Math.round(sum[1] / n),
      Math.round(sum[2] / n),
      Math.round(sum[3] / n),
    ];
  }

  private parseYear(value: string | number | undefined): number | null {
    const yearValue = String(value ?? '').trim();
    if (!yearValue) return null;
    if (!/^\d{4}$/.test(yearValue)) return null;
    return Number(yearValue);
  }

  private isCertificationYearRangeValid(cert: Partial<Certification>): boolean {
    const issued = this.parseYear(cert.issueYear);
    const expires = this.parseYear(cert.expirationYear);

    if (String(cert.issueYear ?? '').trim() && issued === null) return false;
    if (String(cert.expirationYear ?? '').trim() && expires === null) return false;
    if (issued !== null && expires !== null && expires < issued) return false;

    return true;
  }

  private isUploadedCertImage(url: string | undefined): url is string {
    return typeof url === 'string' && url.startsWith('/uploads/');
  }

  private cleanupUploadedCertImage(url: string): void {
    if (!this.isUploadedCertImage(url)) return;
    this.pendingCertUploadUrls.delete(url);
    this.contentService.deleteUploadedImage(url).subscribe({
      error: () => {
        /* best-effort cleanup; nothing actionable here */
      },
    });
  }

  private cleanupUnusedPendingCertUploads(): void {
    const activeUrls = new Set<string>();
    for (const cert of this.certificationsEdit) {
      if (this.isUploadedCertImage(cert.badgeLink)) activeUrls.add(cert.badgeLink);
    }
    if (this.isUploadedCertImage(this.newCert.badgeLink)) {
      activeUrls.add(this.newCert.badgeLink);
    }

    for (const url of Array.from(this.pendingCertUploadUrls)) {
      if (!activeUrls.has(url)) this.cleanupUploadedCertImage(url);
    }
  }

  private releaseSavedCertUploads(certs: Certification[]): void {
    for (const cert of certs) {
      if (this.isUploadedCertImage(cert.badgeLink)) {
        this.pendingCertUploadUrls.delete(cert.badgeLink);
      }
    }
  }

  private deleteRemovedSavedCertUploads(
    previousCertifications: Certification[],
    nextCertifications: Certification[],
  ): void {
    const nextUrls = new Set(
      nextCertifications
        .map((certification) => certification.badgeLink)
        .filter((url): url is string => this.isUploadedCertImage(url)),
    );

    for (const certification of previousCertifications) {
      if (
        this.isUploadedCertImage(certification.badgeLink) &&
        !nextUrls.has(certification.badgeLink)
      ) {
        this.cleanupUploadedCertImage(certification.badgeLink);
      }
    }
  }
}
