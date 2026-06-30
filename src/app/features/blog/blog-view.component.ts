import { CommonModule, DOCUMENT } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  BlogCommentInput,
  BlogPost,
  BlogSocialComment,
  BlogSocialState
} from '@core/models';
import { ContentService } from '@core/services/content.service';
import { renderMarkdown } from '@core/utils/markdown';
import { Subject, map, switchMap, take, takeUntil, tap, timeout } from 'rxjs';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface SeriesItem {
  post: BlogPost;
  part: number;
}
const JSON_LD_ID = 'blog-article-jsonld';

@Component({
  selector: 'app-blog-view',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="bv-page" *ngIf="post; else loading">
      <div class="bv-topbar">
        <div class="bv-topbar-left">
          <a href="" (click)="goBack($event)" class="bv-back">{{ backLabel }}</a>
          <span class="bv-reading-time">{{ post.readingTime }} min read</span>
        </div>
        <span class="bv-progress-label">{{ readingProgress }}% read</span>
      </div>

      <div class="bv-progress-track">
        <span class="bv-progress-fill" [style.width.%]="readingProgress"></span>
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
          <span class="bv-sep">·</span>
          <span>Updated {{ post.publishedAt | date: 'MMM d, y' }}</span>
        </div>
        <div class="bv-trust">
          <span class="bv-trust-item">Tech stack</span>
          <span class="bv-trust-badge" *ngFor="let badge of trustBadges">{{ badge }}</span>
        </div>
      </header>

      <div class="bv-cover" *ngIf="post.coverImage">
        <img
          [src]="post.coverImage"
          [alt]="post.title"
          loading="eager"
          decoding="async"
          fetchpriority="high"
        />
      </div>

      <div class="bv-layout">
        <article class="bv-content">
          <div class="bv-markdown" [innerHTML]="renderedContent"></div>

          <section class="bv-social">
            <h3>Join the conversation</h3>
            <p class="bv-social-status" *ngIf="socialLoading">Loading interactions...</p>
            <p class="bv-social-error" *ngIf="socialError">Interactions could not be loaded right now.</p>
            <div class="bv-social-row">
              <button class="bv-social-btn" [class.active]="isLiked" (click)="toggleLike()" [disabled]="socialLoading || socialError">
                {{ isLiked ? 'Liked' : 'Like' }} · {{ likeCount }}
              </button>
              <button class="bv-social-btn" (click)="focusComments()" [disabled]="socialLoading || socialError">
                Comment · {{ commentCount }}
              </button>
              <button class="bv-social-btn" (click)="sharePost()" [disabled]="socialLoading || socialError">
                Share · {{ shareCount }}
              </button>
            </div>
            <p class="bv-social-hint" *ngIf="shareCopied">Link copied to clipboard.</p>
          </section>

          <section class="bv-comments" id="bv-comments">
            <p class="bv-comments-title">Comments ({{ commentCount }})</p>

            <div class="bv-comment-form">
              <input
                class="bv-comment-name"
                type="text"
                maxlength="48"
                placeholder="Your name (optional)"
                [(ngModel)]="commentAuthor"
              />
              <textarea
                class="bv-comment-input"
                rows="4"
                maxlength="600"
                placeholder="Share your thoughts about this post..."
                [(ngModel)]="commentText"
              ></textarea>
              <button class="bv-comment-submit" (click)="addComment()" [disabled]="!commentText.trim()">
                Post comment
              </button>
            </div>

            <div class="bv-comment-list" *ngIf="comments.length > 0; else noComments">
              <article class="bv-comment-item" *ngFor="let comment of comments">
                <div class="bv-comment-meta">
                  <span>{{ comment.name }}</span>
                  <span class="bv-sep">·</span>
                  <span>{{ comment.createdAt | date: 'MMM d, y, h:mm a' }}</span>
                </div>
                <p>{{ comment.message }}</p>
              </article>
            </div>

            <ng-template #noComments>
              <p class="bv-no-comments">Be the first to comment on this post.</p>
            </ng-template>
          </section>

          <section class="bv-series" *ngIf="seriesName && seriesPosts.length > 1">
            <p class="bv-series-title">Series: {{ seriesName }}</p>
            <div class="bv-series-nav">
              <a *ngIf="previousInSeries" [routerLink]="['/blog', previousInSeries.slug]" [state]="{ from: '/blog' }">
                ← Part {{ previousPart }}: {{ previousInSeries.title }}
              </a>
              <a *ngIf="nextInSeries" [routerLink]="['/blog', nextInSeries.slug]" [state]="{ from: '/blog' }">
                Part {{ nextPart }}: {{ nextInSeries.title }} →
              </a>
            </div>
          </section>

          <section class="bv-sources" *ngIf="sourceLinks.length > 0">
            <p class="bv-sources-title">Referenced links</p>
            <a *ngFor="let source of sourceLinks" [href]="source.href" target="_blank" rel="noopener nofollow">
              {{ source.label }}
            </a>
          </section>
        </article>

        <aside class="bv-toc" *ngIf="tocItems.length >= 3">
          <p class="bv-toc-title">On this page</p>
          <a
            href=""
            *ngFor="let item of tocItems"
            [class.active]="activeTocId === item.id"
            [class.lv3]="item.level === 3"
            (click)="jumpTo(item.id, $event)"
          >
            {{ item.text }}
          </a>
        </aside>
      </div>

      <section class="bv-related" *ngIf="relatedPosts.length > 0">
        <p class="bv-related-title">Related posts</p>
        <div class="bv-related-grid">
          <a
            class="bv-related-card"
            *ngFor="let related of relatedPosts"
            [routerLink]="['/blog', related.slug]"
            [state]="{ from: '/blog' }"
          >
            <p class="bv-related-card-tag">{{ related.tags[0] || 'Blog' }}</p>
            <h3>{{ related.title }}</h3>
            <p>{{ related.excerpt }}</p>
            <span>{{ related.publishedAt | date: 'MMM d, y' }} · {{ related.readingTime }} min read</span>
          </a>
        </div>
      </section>


      <footer class="bv-footer">
        <a href="" (click)="goBack($event)" class="bv-back-footer">{{ backLabel }}</a>
        <p class="bv-footer-note">Written by {{ authorName }} · {{ authorTitle }}</p>
      </footer>
    </div>

    <ng-template #loading>
      <div class="bv-loading" *ngIf="!notFound">
        <div class="bv-skeleton bv-skeleton-title"></div>
        <div class="bv-skeleton bv-skeleton-line"></div>
        <div class="bv-skeleton bv-skeleton-line short"></div>
        <div class="bv-skeleton bv-skeleton-cover"></div>
        <div class="bv-skeleton bv-skeleton-paragraph"></div>
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
export class BlogViewComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private contentService = inject(ContentService);
  private document = inject(DOCUMENT);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  post: BlogPost | null = null;
  renderedContent = '';
  tocItems: TocItem[] = [];
  activeTocId = '';
  readingProgress = 0;
  relatedPosts: BlogPost[] = [];
  sourceLinks: { label: string; href: string }[] = [];
  trustBadges: string[] = [];
  socialState: BlogSocialState | null = null;
  socialLoading = false;
  socialError = false;
  commentAuthor = '';
  commentText = '';
  shareCopied = false;
  seriesName = '';
  seriesPosts: SeriesItem[] = [];
  previousInSeries: BlogPost | null = null;
  nextInSeries: BlogPost | null = null;
  previousPart: number | null = null;
  nextPart: number | null = null;
  notFound = false;
  authorName = 'Anand Rajput';
  authorTitle = 'Angular Developer & Azure Engineer';
  private backTarget = '/blog';
  backLabel = '← Back to Blog';
  private previousScrollRestoration: ScrollRestoration | null = null;
  private socialRequestId = 0;

  ngOnInit(): void {
    if (typeof window !== 'undefined' && 'scrollRestoration' in history) {
      this.previousScrollRestoration = history.scrollRestoration;
      history.scrollRestoration = 'manual';
    }

    this.resolveBackTarget();

    this.route.paramMap
      .pipe(
        map((params) => params.get('slug')),
        tap(() => {
          this.readingProgress = 0;
          this.activeTocId = '';
          this.resetScrollPosition();
        }),
        switchMap((slug) =>
          this.contentService.getPublishedBlogPosts().pipe(
            timeout(12000),
            map((posts) => ({ slug, posts })),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ({ slug, posts }) => {
          const post = posts.find((candidate) => candidate.slug === slug) ?? null;
          this.applyLoadedPost(post, posts);
        },
        error: () => {
          this.notFound = true;
          this.cdr.detectChanges();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.removeJsonLd();
    if (
      typeof window !== 'undefined' &&
      'scrollRestoration' in history &&
      this.previousScrollRestoration
    ) {
      history.scrollRestoration = this.previousScrollRestoration;
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.syncArticleMetrics();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncArticleMetrics();
  }

  goBack(event: Event): void {
    event.preventDefault();
    void this.router.navigateByUrl(this.backTarget);
  }

  jumpTo(id: string, event: Event): void {
    event.preventDefault();
    const target = this.document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  toggleLike(): void {
    if (!this.post) return;
    if (this.socialLoading || this.socialError) return;

    this.socialLoading = true;
    this.contentService.toggleBlogLike(this.post.slug).subscribe({
      next: (state) => {
        this.socialState = this.normalizeSocialState(state);
        this.socialLoading = false;
      },
      error: () => {
        this.socialError = true;
        this.socialLoading = false;
      },
    });
  }

  addComment(): void {
    if (!this.post) return;
    const message = this.commentText.trim();
    if (!message || this.socialLoading || this.socialError) return;
    const name = this.commentAuthor.trim() || 'Guest Reader';

    this.socialLoading = true;
    const payload: BlogCommentInput = { name: name.slice(0, 48), message: message.slice(0, 600) };
    this.contentService.addBlogComment(this.post.slug, payload).subscribe({
      next: (state) => {
        this.socialState = this.normalizeSocialState(state);
        this.commentText = '';
        this.socialLoading = false;
      },
      error: () => {
        this.socialError = true;
        this.socialLoading = false;
      },
    });
  }

  async sharePost(): Promise<void> {
    if (!this.post || typeof window === 'undefined') return;
    if (this.socialLoading || this.socialError) return;
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: this.post.title,
          text: this.post.excerpt,
          url,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        this.shareCopied = true;
        setTimeout(() => {
          this.shareCopied = false;
        }, 1800);
      } else {
        return;
      }

      this.socialLoading = true;
      this.contentService.trackBlogShare(this.post.slug).subscribe({
        next: (state) => {
          this.socialState = this.normalizeSocialState(state);
          this.socialLoading = false;
        },
        error: () => {
          this.socialError = true;
          this.socialLoading = false;
        },
      });
    } catch {
      // User closed native share sheet or clipboard permission was denied.
    }
  }

  focusComments(): void {
    const node = this.document.querySelector('.bv-comment-input') as HTMLTextAreaElement | null;
    node?.focus();
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  get isLiked(): boolean {
    return this.socialState?.viewerLiked === true;
  }

  get likeCount(): number {
    return this.socialState?.likes ?? 0;
  }

  get commentCount(): number {
    return this.socialState?.comments.length ?? 0;
  }

  get shareCount(): number {
    return this.socialState?.shares ?? 0;
  }

  get comments(): BlogSocialComment[] {
    return [...(this.socialState?.comments ?? [])].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
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

  private applyLoadedPost(post: BlogPost | null, allPosts: BlogPost[]): void {
    if (post) {
      this.notFound = false;
      this.post = post;
      this.renderedContent = renderMarkdown(post.content ?? '');
      this.tocItems = this.extractToc(this.renderedContent);
      this.sourceLinks = this.extractSourceLinks(post.content ?? '');
      this.trustBadges = this.extractTrustBadges(post.tags ?? []);
      this.computeRelated(allPosts, post);
      this.computeSeries(allPosts, post);
      this.contentService.trackBlogView(post.slug);
      this.setMetaTags(post);
      this.loadSocialState(post.slug);
      this.resetScrollPosition();
      this.syncArticleMetrics();
      setTimeout(() => this.syncArticleMetrics(), 0);
    } else {
      this.notFound = true;
    }

    this.cdr.detectChanges();
  }

  private resetScrollPosition(): void {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  private setMetaTags(post: BlogPost): void {
    const author = this.authorName || 'Portfolio';
    const absoluteUrl = this.getCurrentAbsoluteUrl();
    const imageUrl = this.toAbsoluteAssetUrl(post.coverImage);
    this.titleService.setTitle(`${post.title} · ${author}`);
    this.metaService.updateTag({ name: 'description', content: post.excerpt ?? '' });
    this.metaService.updateTag({ property: 'og:type', content: 'article' });
    this.metaService.updateTag({ property: 'og:title', content: post.title });
    this.metaService.updateTag({ property: 'og:description', content: post.excerpt ?? '' });
    this.metaService.updateTag({ property: 'og:url', content: absoluteUrl });
    this.metaService.updateTag({ name: 'twitter:title', content: post.title });
    this.metaService.updateTag({ name: 'twitter:description', content: post.excerpt ?? '' });
    if (imageUrl) {
      this.metaService.updateTag({ property: 'og:image', content: imageUrl });
      this.metaService.updateTag({ name: 'twitter:image', content: imageUrl });
    }
    this.metaService.updateTag({
      name: 'twitter:card',
      content: post.coverImage ? 'summary_large_image' : 'summary',
    });
    this.metaService.updateTag({ name: 'article:published_time', content: post.publishedAt });
    this.metaService.updateTag({ name: 'author', content: author });
    this.metaService.updateTag({ name: 'article:tag', content: (post.tags ?? []).slice(0, 6).join(', ') });
    this.upsertCanonical(absoluteUrl);
    this.upsertJsonLd(post, author, absoluteUrl, imageUrl);
  }

  private extractToc(html: string): TocItem[] {
    const items: TocItem[] = [];
    const regex = /<h([2-3]) id="([^"]+)">([\s\S]*?)<\/h\1>/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html))) {
      items.push({
        id: match[2],
        text: match[3].replace(/<[^>]*>/g, '').trim(),
        level: Number(match[1]),
      });
    }

    return items;
  }

  private extractSourceLinks(markdown: string): { label: string; href: string }[] {
    const out: { label: string; href: string }[] = [];
    const seen = new Set<string>();
    const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(markdown))) {
      const label = match[1].trim();
      const href = match[2].trim();
      if (seen.has(href)) continue;
      seen.add(href);
      out.push({ label, href });
      if (out.length >= 5) break;
    }

    return out;
  }

  private extractTrustBadges(tags: string[]): string[] {
    const preferred = [
      'angular',
      'typescript',
      'rxjs',
      'ngrx',
      'azure',
      'devops',
      'node',
      'postgres',
      'performance',
      'testing',
    ];
    const tagMap = new Map(tags.map((tag) => [tag.toLowerCase(), tag]));
    const badges = preferred.filter((key) => tagMap.has(key)).map((key) => tagMap.get(key)!);

    return badges.length > 0 ? badges.slice(0, 5) : tags.slice(0, 4);
  }

  private computeRelated(allPosts: BlogPost[], current: BlogPost): void {
    const currentTags = new Set((current.tags ?? []).map((t) => t.toLowerCase()));
    this.relatedPosts = allPosts
      .filter((candidate) => candidate.slug !== current.slug)
      .filter((candidate) => this.contentService.isBlogPostLive(candidate))
      .map((candidate) => ({
        post: candidate,
        score: (candidate.tags ?? []).reduce(
          (sum, tag) => (currentTags.has(tag.toLowerCase()) ? sum + 1 : sum),
          0,
        ),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || Date.parse(b.post.publishedAt) - Date.parse(a.post.publishedAt))
      .slice(0, 3)
      .map((entry) => entry.post);
  }

  private computeSeries(allPosts: BlogPost[], current: BlogPost): void {
    const series = this.extractSeriesMeta(current);
    if (!series) {
      this.seriesName = '';
      this.seriesPosts = [];
      this.previousInSeries = null;
      this.nextInSeries = null;
      this.previousPart = null;
      this.nextPart = null;
      return;
    }

    this.seriesName = series.name;
    this.seriesPosts = allPosts
      .filter((candidate) => this.contentService.isBlogPostLive(candidate))
      .map((candidate) => ({ post: candidate, meta: this.extractSeriesMeta(candidate) }))
      .filter((entry): entry is { post: BlogPost; meta: { name: string; part: number } } =>
        !!entry.meta && entry.meta.name.toLowerCase() === series.name.toLowerCase(),
      )
      .map((entry) => ({ post: entry.post, part: entry.meta.part }))
      .sort((a, b) => a.part - b.part || Date.parse(a.post.publishedAt) - Date.parse(b.post.publishedAt));

    const index = this.seriesPosts.findIndex((entry) => entry.post.slug === current.slug);
    const prev = index > 0 ? this.seriesPosts[index - 1] : null;
    const next = index >= 0 && index < this.seriesPosts.length - 1 ? this.seriesPosts[index + 1] : null;
    this.previousInSeries = prev?.post ?? null;
    this.previousPart = prev?.part ?? null;
    this.nextInSeries = next?.post ?? null;
    this.nextPart = next?.part ?? null;
  }

  private extractSeriesMeta(post: BlogPost): { name: string; part: number } | null {
    const tags = post.tags ?? [];
    let seriesName = '';
    let part = 0;

    for (const tag of tags) {
      const seriesMatch = tag.match(/^series\s*[:-]\s*(.+)$/i);
      if (seriesMatch) {
        seriesName = seriesMatch[1].trim();
      }

      const partMatch = tag.match(/(?:part|episode|ep)\s*[:#-]?\s*(\d+)/i);
      if (partMatch) {
        part = Number(partMatch[1]) || part;
      }
    }

    if (!part) {
      const titleMatch = post.title.match(/(?:part|episode|ep)\s*(\d+)/i);
      if (titleMatch) {
        part = Number(titleMatch[1]) || 0;
      }
    }

    if (!seriesName || !part) return null;
    return { name: seriesName, part };
  }

  private syncArticleMetrics(): void {
    if (!this.post || typeof window === 'undefined') return;

    const article = this.document.querySelector('.bv-markdown') as HTMLElement | null;
    if (!article) return;

    const rect = article.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 1;
    const articleTop = window.scrollY + rect.top;
    const articleBottom = articleTop + article.offsetHeight;
    const focusLine = window.scrollY + viewportHeight * 0.28;
    const progress = ((focusLine - articleTop) / Math.max(1, articleBottom - articleTop)) * 100;
    this.readingProgress = Math.max(0, Math.min(100, Math.round(progress)));

    const active = this.tocItems
      .map((item) => {
        const el = this.document.getElementById(item.id);
        if (!el) return null;
        return { id: item.id, top: el.getBoundingClientRect().top };
      })
      .filter((entry): entry is { id: string; top: number } => !!entry)
      .filter((entry) => entry.top <= 170)
      .sort((a, b) => b.top - a.top)[0];

    this.activeTocId = active?.id ?? this.tocItems[0]?.id ?? '';
  }

  private loadSocialState(slug: string): void {
    const requestId = ++this.socialRequestId;
    this.socialLoading = true;
    this.socialError = false;
    this.socialState = null;
    this.cdr.detectChanges();

    const failSafe = setTimeout(() => {
      if (requestId !== this.socialRequestId || !this.socialLoading) return;
      this.socialError = true;
      this.socialLoading = false;
      this.socialState = { slug, likes: 0, shares: 0, viewerLiked: false, comments: [] };
      this.cdr.detectChanges();
    }, 9000);

    this.contentService
      .getBlogSocialState(slug)
      .pipe(timeout(8000), take(1))
      .subscribe({
        next: (state) => {
          clearTimeout(failSafe);
          if (requestId !== this.socialRequestId) return;
          this.socialState = this.normalizeSocialState(state);
          this.socialLoading = false;
          this.socialError = false;
          this.cdr.detectChanges();
        },
        error: () => {
          clearTimeout(failSafe);
          if (requestId !== this.socialRequestId) return;
          this.socialError = true;
          this.socialLoading = false;
          this.socialState = { slug, likes: 0, shares: 0, viewerLiked: false, comments: [] };
          this.cdr.detectChanges();
        },
      });
  }

  private normalizeSocialState(state: BlogSocialState): BlogSocialState {
    return {
      slug: state.slug,
      likes: Number.isFinite(state.likes) ? Math.max(0, Math.floor(state.likes)) : 0,
      shares: Number.isFinite(state.shares) ? Math.max(0, Math.floor(state.shares)) : 0,
      viewerLiked: state.viewerLiked === true,
      comments: [...(state.comments ?? [])].slice(-100),
    };
  }

  private getCurrentAbsoluteUrl(): string {
    if (typeof window === 'undefined') return '/blog';
    return window.location.href;
  }

  private toAbsoluteAssetUrl(url: string): string {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (typeof window === 'undefined') return url;
    try {
      return new URL(url, window.location.origin).toString();
    } catch {
      return url;
    }
  }

  private upsertCanonical(url: string): void {
    const head = this.document.head;
    if (!head) return;

    let canonical = head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
  }

  private upsertJsonLd(post: BlogPost, author: string, url: string, imageUrl: string): void {
    const head = this.document.head;
    if (!head) return;

    this.removeJsonLd();
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.id = JSON_LD_ID;
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      datePublished: post.publishedAt,
      dateModified: post.publishedAt,
      author: {
        '@type': 'Person',
        name: author,
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': url,
      },
      image: imageUrl || undefined,
      keywords: (post.tags ?? []).join(', '),
      wordCount: (post.content ?? '').split(/\s+/).filter(Boolean).length,
    });
    head.appendChild(script);
  }

  private removeJsonLd(): void {
    const script = this.document.getElementById(JSON_LD_ID);
    if (script && script.parentNode) {
      script.parentNode.removeChild(script);
    }
  }
}
