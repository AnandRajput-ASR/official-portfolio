import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BlogPost } from '@core/models';
import { ContentService } from '@core/services/content.service';
import { renderMarkdown } from '@core/utils/markdown';

@Component({
  selector: 'app-blog-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bv-page" *ngIf="post; else loading">
      <div class="bv-topbar">
        <a routerLink="/blog" class="bv-back">← Back to Blog</a>
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
        <a routerLink="/blog" class="bv-back-footer">← Back to Blog</a>
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
      <a routerLink="/blog" class="bv-back">← Back to Blog</a>
    </div>
  `,
  styleUrls: ['./blog-view.component.scss'],
})
export class BlogViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private contentService = inject(ContentService);
  private titleService = inject(Title);
  private metaService = inject(Meta);

  post: BlogPost | null = null;
  renderedContent = '';
  notFound = false;
  authorName = 'Anand Rajput';
  authorTitle = 'Angular Developer & Azure Engineer';

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    this.contentService.getPublishedBlogPostBySlug(slug).subscribe({
      next: ({ post, content }) => {
        if (post) {
          this.post = post;
          this.renderedContent = renderMarkdown(post.content ?? '');
          this.contentService.trackEvent('blogView');
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
