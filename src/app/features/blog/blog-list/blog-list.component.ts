import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BlogPost } from '@core/models';
import { ContentService } from '@core/services/content.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="bl-page">
      <header class="bl-header">
        <h1>Blog</h1>
        <p>Technical writing on Angular, Azure, and shipping software.</p>
      </header>

      <section class="bl-toolbar" *ngIf="!loading && posts.length > 0">
        <div class="bl-toolbar-row">
          <input
            type="search"
            class="bl-search"
            placeholder="Search title, excerpt, tags..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="applyFilters()"
          />
          <select class="bl-sort" [(ngModel)]="sortBy" (ngModelChange)="applyFilters()">
            <option value="newest">Sort: Newest</option>
            <option value="popular">Sort: Popular</option>
          </select>
        </div>

        <div class="bl-tags-filter">
          <button class="bl-tag-filter" [class.active]="!activeTag" (click)="selectTag()">
            All
          </button>
          <button
            class="bl-tag-filter"
            *ngFor="let tag of allTags"
            [class.active]="activeTag === tag"
            (click)="selectTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </section>

      <div class="bl-loading" *ngIf="loading">
        <div class="bl-loader"></div>
        <p>Loading posts…</p>
      </div>

      <div class="bl-empty" *ngIf="!loading && loadError">
        <span>⚠️</span>
        <p>Could not load posts right now. Please try again.</p>
      </div>

      <div class="bl-empty" *ngIf="!loading && !loadError && filteredPosts.length === 0">
        <span>✍️</span>
        <p>No posts match your current filter.</p>
      </div>

      <div class="bl-grid" *ngIf="!loading && filteredPosts.length > 0">
        <a
          *ngFor="let post of filteredPosts; trackBy: trackById"
          [routerLink]="['/blog', post.slug]"
          [state]="{ from: currentListUrl }"
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
            <ng-container *ngIf="sortBy === 'popular'">
              <span class="bl-sep">·</span>
              <span>{{ popularity(post.slug) }} views</span>
            </ng-container>
          </div>
        </a>
      </div>
    </div>
  `,
  styleUrls: ['./blog-list.component.scss'],
})
export class BlogListComponent implements OnInit {
  private contentService = inject(ContentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  posts: BlogPost[] = [];
  filteredPosts: BlogPost[] = [];
  allTags: string[] = [];
  popularityMap: Record<string, number> = {};

  activeTag = '';
  searchTerm = '';
  sortBy: 'newest' | 'popular' = 'newest';
  loading = true;
  loadError = false;
  currentListUrl = '/blog';

  ngOnInit(): void {
    this.currentListUrl = this.router.url;

    this.route.paramMap.subscribe((params) => {
      const tagFromRoute = params.get('tag');
      this.activeTag = tagFromRoute ? decodeURIComponent(tagFromRoute) : '';
      this.currentListUrl = this.router.url;
      this.applyFilters();
      this.cdr.detectChanges();
    });

    this.contentService
      .getPublishedBlogPosts()
      .pipe(timeout(10000))
      .subscribe({
      next: (posts) => {
        this.loadError = false;
        this.posts = posts;
        this.popularityMap = this.contentService.getBlogPopularityMap();
        this.allTags = Array.from(new Set(posts.flatMap((post) => post.tags || []))).sort((a, b) =>
          a.localeCompare(b),
        );
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadError = true;
        this.filteredPosts = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      });
  }

  applyFilters(): void {
    const q = this.searchTerm.trim().toLowerCase();
    const tag = this.activeTag.trim().toLowerCase();

    const filtered = this.posts.filter((post) => {
      const postTags = (post.tags || []).map((t) => t.toLowerCase());
      const inTag = !tag || postTags.includes(tag);
      if (!inTag) return false;

      if (!q) return true;
      const hay = [post.title, post.excerpt, post.tags.join(' '), post.content.slice(0, 300)]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });

    this.filteredPosts = filtered.sort((a, b) => {
      if (this.sortBy === 'popular') {
        const delta = this.popularity(b.slug) - this.popularity(a.slug);
        if (delta !== 0) return delta;
      }
      return (Date.parse(b.publishedAt || '') || 0) - (Date.parse(a.publishedAt || '') || 0);
    });
  }

  selectTag(tag = ''): void {
    this.activeTag = tag;
    this.applyFilters();

    if (tag) {
      void this.router.navigate(['/blog/tag', tag]);
      return;
    }
    void this.router.navigate(['/blog']);
  }

  popularity(slug: string): number {
    return this.popularityMap[slug] ?? 0;
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
