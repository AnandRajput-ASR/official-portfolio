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
      <header class="bl-hero">
        <p class="bl-eyebrow">INSIGHTS · ENGINEERING · BUILD LOG</p>
        <h1>Stories from building real-world products.</h1>
        <p class="bl-subtitle">
          Deep dives on Angular architecture, Azure deployment decisions, and practical delivery
          patterns from production work.
        </p>
        <div class="bl-hero-stats" *ngIf="!loading && posts.length > 0">
          <div class="bl-stat">
            <span class="bl-stat-value">{{ posts.length }}</span>
            <span class="bl-stat-label">Published posts</span>
          </div>
          <div class="bl-stat">
            <span class="bl-stat-value">{{ allTags.length }}</span>
            <span class="bl-stat-label">Topics</span>
          </div>
          <div class="bl-stat">
            <span class="bl-stat-value">{{ totalReadMinutes }}</span>
            <span class="bl-stat-label">Minutes to read all</span>
          </div>
          <div class="bl-stat" *ngIf="totalViews > 0">
            <span class="bl-stat-value">{{ totalViews }}</span>
            <span class="bl-stat-label">Tracked reads</span>
          </div>
        </div>
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

        <div class="bl-toolbar-meta">
          <p class="bl-results">
            Showing {{ filteredPosts.length }} of {{ posts.length }} posts
            <span *ngIf="activeTag"> · Tag: {{ activeTag }}</span>
            <span *ngIf="searchTerm.trim()"> · Search: "{{ searchTerm.trim() }}"</span>
          </p>
          <button class="bl-clear" *ngIf="hasActiveFilters" (click)="clearFilters()">Clear filters</button>
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
        <button class="bl-clear" (click)="clearFilters()">Reset filters</button>
      </div>

      <section *ngIf="!loading && featuredPosts.length > 0" class="bl-featured-list">
        <a
          *ngFor="let featuredPost of featuredPosts; let idx = index; trackBy: trackById"
          class="bl-featured"
          [routerLink]="['/blog', featuredPost.slug]"
          [state]="{ from: currentListUrl }"
        >
          <div class="bl-featured-media" *ngIf="featuredPost.coverImage; else featuredFallback">
            <img
              [src]="featuredPost.coverImage"
              [alt]="featuredPost.title"
              [loading]="idx === 0 ? 'eager' : 'lazy'"
              decoding="async"
              [attr.fetchpriority]="idx === 0 ? 'high' : null"
            />
          </div>
          <ng-template #featuredFallback>
            <div class="bl-featured-fallback">Featured</div>
          </ng-template>
          <div class="bl-featured-content">
            <p class="bl-featured-kicker">Featured Story</p>
            <h2>{{ featuredPost.title }}</h2>
            <p>{{ featuredPost.excerpt }}</p>
            <div class="bl-featured-meta">
              <span>{{ featuredPost.publishedAt | date: 'MMMM d, y' }}</span>
              <span class="bl-sep">·</span>
              <span>{{ featuredPost.readingTime }} min read</span>
              <span class="bl-sep" *ngIf="popularity(featuredPost.slug) > 0">·</span>
              <span *ngIf="popularity(featuredPost.slug) > 0">{{ popularity(featuredPost.slug) }} views</span>
            </div>
          </div>
        </a>
      </section>

      <div class="bl-grid" *ngIf="!loading && listPosts.length > 0">
        <a
          *ngFor="let post of listPosts; trackBy: trackById"
          [routerLink]="['/blog', post.slug]"
          [state]="{ from: currentListUrl }"
          class="bl-card"
        >
          <div class="bl-card-media" *ngIf="post.coverImage; else cardFallback">
            <img [src]="post.coverImage" [alt]="post.title" loading="lazy" decoding="async" />
          </div>
          <ng-template #cardFallback>
            <div class="bl-card-fallback">Post</div>
          </ng-template>
          <div class="bl-card-tags">
            <span *ngFor="let tag of displayTags(post)" class="bl-card-tag">{{ tag }}</span>
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
  private readonly FEATURED_TAG = 'featured';
  private contentService = inject(ContentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  posts: BlogPost[] = [];
  filteredPosts: BlogPost[] = [];
  listPosts: BlogPost[] = [];
  featuredPosts: BlogPost[] = [];
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
        this.allTags = Array.from(new Set(posts.flatMap((post) => post.tags || [])))
          .filter((tag) => tag.toLowerCase() !== this.FEATURED_TAG)
          .sort((a, b) => a.localeCompare(b));
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

    this.featuredPosts = this.pickFeaturedPosts(this.filteredPosts);
    const featuredIds = new Set(this.featuredPosts.map((post) => post.id));
    this.listPosts = this.filteredPosts.filter((post) => !featuredIds.has(post.id));
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

  clearFilters(): void {
    this.searchTerm = '';
    this.sortBy = 'newest';
    this.selectTag('');
  }

  get hasActiveFilters(): boolean {
    return !!this.activeTag || !!this.searchTerm.trim() || this.sortBy === 'popular';
  }

  get totalReadMinutes(): number {
    return this.posts.reduce((sum, post) => sum + (post.readingTime || 0), 0);
  }

  get totalViews(): number {
    return Object.values(this.popularityMap).reduce((sum, views) => sum + (views || 0), 0);
  }

  popularity(slug: string): number {
    return this.popularityMap[slug] ?? 0;
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  displayTags(post: BlogPost): string[] {
    return (post.tags || []).filter((tag) => tag.toLowerCase() !== this.FEATURED_TAG);
  }

  private pickFeaturedPosts(posts: BlogPost[]): BlogPost[] {
    if (!posts.length) return [];
    const explicitFeatured = posts.filter((post) =>
      (post.tags || []).some((tag) => tag.toLowerCase() === this.FEATURED_TAG),
    );
    if (explicitFeatured.length > 0) {
      return explicitFeatured;
    }
    return posts.slice(0, 1);
  }
}
