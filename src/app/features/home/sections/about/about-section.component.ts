import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
    ViewEncapsulation,
} from '@angular/core';
import { PortfolioContent, Stat } from '@core/models';

@Component({
  selector: 'app-about-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about-section.component.html',
  styleUrls: ['./about-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AboutSectionComponent {
  @Input({ required: true }) content!: PortfolioContent;
  @Output() socialClick = new EventEmitter<void>();

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  trackByStat(_: number, item: Stat): string {
    return item.id;
  }
}
