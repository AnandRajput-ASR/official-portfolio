import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-ticker-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticker-section.component.html',
  styleUrls: ['./ticker-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TickerSectionComponent {
  @Input() items: string[] = [];
}
