import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
    ViewEncapsulation,
    inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentService } from '@core/services/content.service';
import { LanguageService } from '@core/services/language.service';
import { ResumeService } from '@core/services/resume.service';

@Component({
  selector: 'app-resume-gate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './resume-gate.component.html',
  styleUrls: ['./resume-gate.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ResumeGateComponent implements OnChanges {
  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();

  private contentService = inject(ContentService);
  private resumeService = inject(ResumeService);
  langService = inject(LanguageService);

  resumeGateEmail = '';
  resumeGateError = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.resumeGateEmail = '';
      this.resumeGateError = '';
    }
  }

  closeResumeGate(): void {
    this.openChange.emit(false);
  }

  submitResumeGate(): void {
    const email = this.resumeGateEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.resumeGateError = 'Please enter a valid email address.';
      return;
    }
    // Send the email to the backend (stored in resume_leads + email notification)
    this.contentService.trackResumeLead(email);
    // Track it as a resumeDownload analytics event
    this.contentService.trackEvent('resumeDownload');
    this.openChange.emit(false);
    // Trigger download programmatically
    const a = document.createElement('a');
    a.href = this.resumeService.getDownloadUrl();
    a.download = '';
    a.click();
  }
}
