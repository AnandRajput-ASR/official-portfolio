import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BlogPost } from '@core/models';
import { ContentService } from '@core/services/content.service';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bl-page">
      <header class="bl-header">
        <h1>Blog</h1>
        <p>Technical writing on Angular, Azure, and shipping software.</p>
      </header>

      <div class="bl-loading" *ngIf="loading">
        <div class="bl-loader"></div>
        <p>Loading posts…</p>
      </div>

      <div class="bl-empty" *ngIf="!loading && posts.length === 0">
        <span>✍️</span>
        <p>No posts published yet — check back soon.</p>
      </div>

      <div class="bl-grid" *ngIf="!loading && posts.length > 0">
        <a
          *ngFor="let post of posts; trackBy: trackById"
          [routerLink]="['/blog', post.slug]"
          class="bl-card"
        >
          <div class="bl-card-tags">
            <span *ngFor="let tag of post.tags" class="bl-card-tag">{{ tag }}</span>
          </div>
          <h2 class="bl-card-title">{{ post.title }}</h2>
          <p class="bl-card-excerpt">{{ post.excerpt }}</p>
          <div class="bl-card-meta">
            <span>{{ post.publishedAt | date: 'MMM d, y' }}</span>
            <span class="bl-sep">·</span>
            <span>{{ post.readingTime }} min read</span>
          </div>
        </a>
      </div>
    </div>
  `,
  styleUrls: ['./blog-list.component.scss'],
})
export class BlogListComponent implements OnInit {
  private contentService = inject(ContentService);

  posts: BlogPost[] = [];
  loading = true;

  ngOnInit(): void {
    this.contentService.getPublishedBlogPosts().subscribe({
      next: (posts) => {
        this.posts = posts;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
