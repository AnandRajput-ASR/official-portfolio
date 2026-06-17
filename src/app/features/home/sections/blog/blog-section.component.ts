import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Input,
    ViewEncapsulation,
    inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { PortfolioContent } from '@core/models';
import { ContentService } from '@core/services/content.service';

@Component({
  selector: 'app-blog-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blog-section.component.html',
  styleUrls: ['./blog-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class BlogSectionComponent {
  @Input({ required: true }) content!: PortfolioContent;

  private router = inject(Router);
  private contentService = inject(ContentService);

  publishedPosts() {
    return (this.content?.blogPosts || [])
      .filter((p) => this.contentService.isBlogPostLive(p))
      .sort((a, b) => Date.parse(b.publishedAt || '') - Date.parse(a.publishedAt || ''));
  }

  navigateToBlog(slug: string): void {
    this.router.navigate(['/blog', slug]);
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
