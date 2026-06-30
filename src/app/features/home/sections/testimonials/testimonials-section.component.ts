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
import { LanguageService } from '@core/services/language.service';

@Component({
  selector: 'app-testimonials-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './testimonials-section.component.html',
  styleUrls: ['./testimonials-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TestimonialsSectionComponent {
  @Input({ required: true }) content!: PortfolioContent;

  contentService = inject(ContentService);
  langService = inject(LanguageService);

  // Testimonial submission form
  testiSubmitForm = { name: '', role: '', company: '', quote: '', rating: 5, email: '' };
  testiSubmitAvatar: string | null = null;
  testiSubmitting = false;
  testiSubmitSuccess = false;
  testiSubmitError = '';
  showTestiSubmitForm = false;

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  visibleTestimonials() {
    return (this.content?.testimonials || []).filter((t) => t.visible && t.is_deleted !== true);
  }

  stars(n: number): number[] {
    return Array(n).fill(0);
  }

  submitPublicTestimonial(): void {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.testiSubmitForm.name || !this.testiSubmitForm.quote) {
      this.testiSubmitError = 'Name and your testimonial are required.';
      return;
    }
    if (!this.testiSubmitForm.email || !emailPattern.test(this.testiSubmitForm.email)) {
      this.testiSubmitError = 'A valid email address is required.';
      return;
    }
    this.testiSubmitting = true;
    this.testiSubmitError = '';
    const payload = { ...this.testiSubmitForm, avatar: this.testiSubmitAvatar || undefined };
    this.contentService.submitTestimonial(payload).subscribe({
      next: () => {
        this.testiSubmitting = false;
        this.testiSubmitSuccess = true;
        this.testiSubmitForm = { name: '', role: '', company: '', quote: '', rating: 5, email: '' };
        this.testiSubmitAvatar = null;
        setTimeout(() => {
          this.testiSubmitSuccess = false;
          this.showTestiSubmitForm = false;
        }, 5000);
      },
      error: (err) => {
        this.testiSubmitting = false;
        this.testiSubmitError = err.error?.message || 'Submission failed. Please try again.';
      },
    });
  }

  onTestiAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) {
      this.testiSubmitError = 'Photo must be under 2 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.testiSubmitAvatar = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeTestiAvatar(): void {
    this.testiSubmitAvatar = null;
  }

  setTestiRating(n: number): void {
    this.testiSubmitForm.rating = n;
  }
}
