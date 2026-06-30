import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
    ViewEncapsulation,
    inject,
} from '@angular/core';
import { PortfolioContent } from '@core/models';
import { ResumeInfo, ResumeService } from '@core/services/resume.service';

@Component({
  selector: 'app-freelance-cta-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './freelance-cta-section.component.html',
  styleUrls: ['./freelance-cta-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class FreelanceCtaSectionComponent {
  @Input({ required: true }) content!: PortfolioContent;
  @Input() resumeInfo: ResumeInfo | null = null;
  @Output() resumeClick = new EventEmitter<Event>();

  resumeService = inject(ResumeService);
}
