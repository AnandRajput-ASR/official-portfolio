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
import { LanguageService } from '@core/services/language.service';
import { ResumeInfo, ResumeService } from '@core/services/resume.service';

@Component({
  selector: 'app-resume-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resume-banner.component.html',
  styleUrls: ['./resume-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ResumeBannerComponent {
  @Input() resumeInfo: ResumeInfo | null = null;
  @Output() resumeClick = new EventEmitter<Event>();

  resumeService = inject(ResumeService);
  langService = inject(LanguageService);
}
