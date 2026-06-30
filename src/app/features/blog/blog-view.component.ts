import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { BlogPost } from '@core/models';
import { ContentService } from '@core/services/content.service';
import { renderMarkdown } from '@core/utils/markdown';

@Component({
  selector: 'app-blog-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bv-page" *ngIf="post; else loading">
      <div class="bv-topbar">
        <a href="" (click)="goBack($event)" class="bv-back">{{ backLabel }}</a>
        <span class="bv-reading-time">{{ post.readingTime }} min read</span>
      </div>

      <header class="bv-header">
        <div class="bv-tags">
          <span class="bv-tag" *ngFor="let tag of post.tags">{{ tag }}</span>
        </div>
        <h1 class="bv-title">{{ post.title }}</h1>
        <p class="bv-excerpt">{{ post.excerpt }}</p>
        <div class="bv-meta">
          <span class="bv-author">{{ authorName }}</span>
          <span class="bv-sep">·</span>
          <span class="bv-date">{{ post.publishedAt | date: 'MMMM d, yyyy' }}</span>
        </div>
      </header>

      <article class="bv-content">
        <div class="bv-markdown" [innerHTML]="renderedContent"></div>
      </article>

      <footer class="bv-footer">
        <a href="" (click)="goBack($event)" class="bv-back-footer">{{ backLabel }}</a>
        <p class="bv-footer-note">Written by {{ authorName }} · {{ authorTitle }}</p>
      </footer>
    </div>

    <ng-template #loading>
      <div class="bv-loading">
        <div class="bv-loader"></div>
        <p>Loading article...</p>
      </div>
    </ng-template>

    <div class="bv-404" *ngIf="notFound">
      <span class="bv-404-icon">✍️</span>
      <h2>Article not found</h2>
      <p class="bv-404-sub">This article may have been removed or the link is incorrect.</p>
      <a href="" (click)="goBack($event)" class="bv-back">{{ backLabel }}</a>
    </div>
  `,
  styleUrls: ['./blog-view.component.scss'],
})
export class BlogViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private contentService = inject(ContentService);
  private titleService = inject(Title);
  private metaService = inject(Meta);

  post: BlogPost | null = null;
  renderedContent = '';
  notFound = false;
  authorName = 'Anand Rajput';
  authorTitle = 'Angular Developer & Azure Engineer';
  private backTarget = '/blog';
  backLabel = '← Back to Blog';

  ngOnInit(): void {
    this.resolveBackTarget();

    const slug = this.route.snapshot.paramMap.get('slug');
    this.contentService.getPublishedBlogPostBySlug(slug).subscribe({
      next: ({ post, content }) => {
        if (post) {
          this.post = post;
          this.renderedContent = renderMarkdown(post.content ?? '');
          this.contentService.trackBlogView(post.slug);
          this.setMetaTags(post, content);
        } else {
          this.notFound = true;
        }
        if (content.hero?.name) this.authorName = content.hero.name;
        if (content.hero?.title) this.authorTitle = content.hero.title;
      },
      error: () => {
        this.notFound = true;
      },
    });
  }

  goBack(event: Event): void {
    event.preventDefault();
    void this.router.navigateByUrl(this.backTarget);
  }

  private resolveBackTarget(): void {
    const from = this.router.getCurrentNavigation()?.extras.state?.['from'] ?? history.state?.from;

    if (from === '/') {
      this.backTarget = '/';
      this.backLabel = '← Back to Home';
      return;
    }

    if (typeof from === 'string' && from.startsWith('/blog')) {
      this.backTarget = from;
      this.backLabel = '← Back to Blog';
      return;
    }

    this.backTarget = '/blog';
    this.backLabel = '← Back to Blog';
  }

  private setMetaTags(post: BlogPost, content: { hero?: { name?: string } }): void {
    const author = content.hero?.name ?? 'Portfolio';
    this.titleService.setTitle(`${post.title} · ${author}`);
    this.metaService.updateTag({ name: 'description', content: post.excerpt ?? '' });
    this.metaService.updateTag({ property: 'og:type', content: 'article' });
    this.metaService.updateTag({ property: 'og:title', content: post.title });
    this.metaService.updateTag({ property: 'og:description', content: post.excerpt ?? '' });
    if (post.coverImage) {
      this.metaService.updateTag({ property: 'og:image', content: post.coverImage });
    }
    this.metaService.updateTag({
      name: 'twitter:card',
      content: post.coverImage ? 'summary_large_image' : 'summary',
    });
    this.metaService.updateTag({ name: 'article:published_time', content: post.publishedAt });
  }
}
