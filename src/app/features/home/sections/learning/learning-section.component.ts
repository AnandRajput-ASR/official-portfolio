import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Input,
    ViewEncapsulation,
    inject,
} from '@angular/core';
import { PortfolioContent } from '@core/models';
import { LanguageService } from '@core/services/language.service';

@Component({
  selector: 'app-learning-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './learning-section.component.html',
  styleUrls: ['./learning-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class LearningSectionComponent {
  @Input({ required: true }) content!: PortfolioContent;

  langService = inject(LanguageService);
}
