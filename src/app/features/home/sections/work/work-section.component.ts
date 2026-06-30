import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
    ViewEncapsulation,
} from '@angular/core';
import { PortfolioContent } from '@core/models';

@Component({
  selector: 'app-work-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './work-section.component.html',
  styleUrls: ['./work-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WorkSectionComponent {
  @Input({ required: true }) content!: PortfolioContent;
  @Input() openCompanies = new Set<string>();
  @Output() toggleCompany = new EventEmitter<string>();

  visibleCompanies() {
    return (this.content?.companies ?? []).filter((co) => co.is_deleted !== true);
  }

  visibleProjects(companyId: string) {
    const company = (this.content?.companies ?? []).find((co) => co.id === companyId);
    return (company?.projects ?? []).filter((project) => project.is_deleted !== true);
  }

  isCompanyOpen(id: string): boolean {
    return this.openCompanies.has(id);
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  calcTenure(co: { startDate?: string; endDate?: string; current?: boolean }): string {
    if (!co.startDate) return '';
    const start = new Date(co.startDate + '-01');
    const end = co.current || !co.endDate ? new Date() : new Date(co.endDate + '-01');
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (months < 1) return '';
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y === 0) return `${m}mo`;
    if (m === 0) return `${y}yr`;
    return `${y}yr ${m}mo`;
  }

  /** Ensures external links always have a protocol so the browser doesn't
   *  treat bare URLs like "www.google.com" as relative paths. */
  externalUrl(url: string | null | undefined): string {
    if (!url || url === '#') return '#';
    return /^https?:\/\//i.test(url) ? url : 'https://' + url;
  }
}
