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
import { LanguageService } from '@core/services/language.service';
import { ResumeInfo, ResumeService } from '@core/services/resume.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-header-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class HeaderSectionComponent {
  @Input({ required: true }) content!: PortfolioContent;
  @Input() resumeInfo: ResumeInfo | null = null;
  @Input() otwDismissed = false;
  @Input() showReviewsLink = false;
  @Input() showWritingLink = false;

  @Output() dismiss = new EventEmitter<void>();
  @Output() resumeClick = new EventEmitter<Event>();

  themeService = inject(ThemeService);
  langService = inject(LanguageService);
  resumeService = inject(ResumeService);

  mobileMenuOpen = false;

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }
}
