import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Input,
    ViewEncapsulation,
    inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PortfolioContent } from '@core/models';
import { ContentService } from '@core/services/content.service';
import { MessagesService } from '@core/services/messages.service';

@Component({
  selector: 'app-contact-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact-section.component.html',
  styleUrls: ['./contact-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ContactSectionComponent {
  @Input({ required: true }) content!: PortfolioContent;

  private contentService = inject(ContentService);
  private messagesService = inject(MessagesService);

  contactForm = { name: '', email: '', message: '', _hp: '' };
  contactSending = false;
  contactSuccess = false;
  contactError = '';
  emailCopied = false;

  trackSocialClick(): void {
    this.contentService.trackEvent('socialClick');
  }

  sendMessage(): void {
    const { name, email, message } = this.contactForm;
    if (!name || !email || !message) {
      this.contactError = 'Please fill in all fields.';
      return;
    }
    this.contactSending = true;
    this.contactError = '';
    this.messagesService.sendMessage(this.contactForm).subscribe({
      next: () => {
        this.contactSending = false;
        this.contactSuccess = true;
        this.contactForm = { name: '', email: '', message: '', _hp: '' };
        this.contentService.trackEvent('contactSubmit');
        setTimeout(() => (this.contactSuccess = false), 6000);
      },
      error: (err) => {
        this.contactSending = false;
        this.contactError = err.error?.message || 'Failed to send. Please try again.';
      },
    });
  }

  /** Copies email address to clipboard; shows confirmation for 2 s. */
  copyEmail(): void {
    navigator.clipboard.writeText(this.content.hero.email).then(() => {
      this.emailCopied = true;
      setTimeout(() => (this.emailCopied = false), 2000);
    });
  }
}
