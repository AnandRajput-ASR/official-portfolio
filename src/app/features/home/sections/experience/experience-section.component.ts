import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Input,
    ViewEncapsulation,
} from '@angular/core';
import { PortfolioContent } from '@core/models';

@Component({
  selector: 'app-experience-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experience-section.component.html',
  styleUrls: ['./experience-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ExperienceSectionComponent {
  @Input({ required: true }) content!: PortfolioContent;

  visibleExperience() {
    return (this.content?.experience ?? []).filter((exp) => exp.is_deleted !== true);
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
