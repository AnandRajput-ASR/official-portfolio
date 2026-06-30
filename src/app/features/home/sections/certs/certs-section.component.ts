import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Input,
    ViewEncapsulation,
} from '@angular/core';
import { Certification, PortfolioContent } from '@core/models';
import { CertificationBadgeComponent } from '@shared/components/certification-badge/certification-badge.component';

@Component({
  selector: 'app-certs-section',
  standalone: true,
  imports: [CommonModule, CertificationBadgeComponent],
  templateUrl: './certs-section.component.html',
  styleUrls: ['./certs-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class CertsSectionComponent {
  @Input({ required: true }) content!: PortfolioContent;

  get currentYear(): number {
    return new Date().getFullYear();
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  certificationStatus(cert: Partial<Certification>): 'active' | 'expired' | 'no-expiry' {
    const expiration = String(cert.expirationYear ?? '').trim();
    const expires = Number(expiration);
    if (!expiration || Number.isNaN(expires)) return 'no-expiry';
    return expires < this.currentYear ? 'expired' : 'active';
  }

  verificationLabel(url: string | null | undefined): string {
    const safeUrl = this.externalUrl(url).toLowerCase();
    if (safeUrl.includes('credly.com')) return 'Verify on Credly';
    if (safeUrl.includes('microsoft.')) return 'Verify on Microsoft';
    return 'Verify Certificate';
  }

  /** Ensures external links always have a protocol so the browser doesn't
   *  treat bare URLs like "www.google.com" as relative paths. */
  externalUrl(url: string | null | undefined): string {
    if (!url || url === '#') return '#';
    return /^https?:\/\//i.test(url) ? url : 'https://' + url;
  }
}
