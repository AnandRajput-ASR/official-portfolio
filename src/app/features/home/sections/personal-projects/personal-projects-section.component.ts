import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Input,
    ViewEncapsulation,
} from '@angular/core';
import { PortfolioContent } from '@core/models';

@Component({
  selector: 'app-personal-projects-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './personal-projects-section.component.html',
  styleUrls: ['./personal-projects-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PersonalProjectsSectionComponent {
  @Input({ required: true }) content!: PortfolioContent;

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  /** Ensures external links always have a protocol so the browser doesn't
   *  treat bare URLs like "www.google.com" as relative paths. */
  externalUrl(url: string | null | undefined): string {
    if (!url || url === '#') return '#';
    return /^https?:\/\//i.test(url) ? url : 'https://' + url;
  }
}
