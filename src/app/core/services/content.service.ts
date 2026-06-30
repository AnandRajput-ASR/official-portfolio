import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
    ApiResponse,
    BlogCommentInput,
    BlogPost,
    BlogSocialState,
    PortfolioContent,
    SiteSettings,
    Testimonial,
} from '@core/models';
import { normalizePortfolioContent, normalizeSettingsSingleton } from '@core/utils/wave2-compat';
import { environment } from '@env/environment';
import { map, Observable, shareReplay } from 'rxjs';
import { StorageService } from './storage.service';

export type ResumeFunnelStage = 'view' | 'click' | 'download';

export interface ResumeFunnelEvent {
  ts: number;
  source: string;
  stage: ResumeFunnelStage;
}

export interface ResumeFunnelBySource {
  source: string;
  views: number;
  clicks: number;
  downloads: number;
  clickToDownloadRate: number;
}

export interface ResumeFunnelSummary {
  timeframeDays: number;
  totals: { views: number; clicks: number; downloads: number };
  bySource: ResumeFunnelBySource[];
}

@Injectable({
  providedIn: 'root',
})
export class ContentService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);

  private base = environment.api.baseUrl + '/content';
  private static readonly BLOG_POPULARITY_KEY = 'blog-popularity';
  private static readonly RESUME_FUNNEL_KEY = 'resume-funnel-events';
  private static readonly RESUME_FUNNEL_LIMIT = 2000;
  private cachedContent$?: Observable<PortfolioContent>;

  /** Resolve a stored image value to a full URL.
   *  Handles: /uploads/... paths (from new file storage) and legacy data: base64 */
  getImageUrl(val: string | undefined): string {
    if (!val) return '';
    if (val.startsWith('data:') || val.startsWith('http')) return val;

    if (val.startsWith('/uploads/')) {
      if (environment.api.baseUrl.startsWith('http')) {
        return environment.api.baseUrl.replace(/\/api\/?$/, '') + val;
      }

      return val;
    }

    return environment.assets.baseUrl + val;
  }

  getAll(): Observable<PortfolioContent> {
    return this.http
      .get<unknown>(this.base + '/page-content')
      .pipe(map((res) => normalizePortfolioContent(res)));
  }

  /** Cached page-content stream to prevent repeated heavy payload requests. */
  getAllCached(): Observable<PortfolioContent> {
    if (!this.cachedContent$) {
      this.cachedContent$ = this.getAll().pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.cachedContent$;
  }

  getPublishedBlogPosts(): Observable<BlogPost[]> {
    return this.getAllCached().pipe(
      map((content) =>
        (content.blogPosts ?? [])
          .filter((p) => this.isBlogPostLive(p))
          .sort((a, b) => this.toDateMs(b.publishedAt) - this.toDateMs(a.publishedAt)),
      ),
    );
  }

  getPublishedBlogPostBySlug(
    slug: string | null,
  ): Observable<{ post: BlogPost | null; content: PortfolioContent }> {
    return this.getAllCached().pipe(
      map((content) => ({
        content,
        post:
          (content.blogPosts ?? []).find(
            (p) => p.slug === slug && this.isBlogPostLive(p),
          ) ?? null,
      })),
    );
  }

  getBlogSocialState(slug: string): Observable<BlogSocialState> {
    return this.http.get<BlogSocialState>(this.base + `/blogs/${encodeURIComponent(slug)}/social`, {
      withCredentials: true,
    });
  }

  toggleBlogLike(slug: string): Observable<BlogSocialState> {
    return this.http.post<BlogSocialState>(
      this.base + `/blogs/${encodeURIComponent(slug)}/like`,
      {},
      { withCredentials: true },
    );
  }

  addBlogComment(slug: string, comment: BlogCommentInput): Observable<BlogSocialState> {
    return this.http.post<BlogSocialState>(
      this.base + `/blogs/${encodeURIComponent(slug)}/comments`,
      comment,
      { withCredentials: true },
    );
  }

  trackBlogShare(slug: string): Observable<BlogSocialState> {
    return this.http.post<BlogSocialState>(
      this.base + `/blogs/${encodeURIComponent(slug)}/share`,
      {},
      { withCredentials: true },
    );
  }

  isBlogPostLive(post: BlogPost): boolean {
    if (!post || post.is_deleted === true || !post.published) return false;
    const now = Date.now();
    const publishAtMs = this.toDateMs(post.publishedAt);
    const unpublishAtMs = this.toDateMs(post.unpublishedAt);

    if (publishAtMs > 0 && publishAtMs > now) return false;
    if (unpublishAtMs > 0 && unpublishAtMs <= now) return false;
    return true;
  }

  trackBlogView(slug: string): void {
    if (!slug) return;

    const map = this.getBlogPopularityMap();
    map[slug] = (map[slug] ?? 0) + 1;
    this.storage.set(ContentService.BLOG_POPULARITY_KEY, map);

    this.trackEvent('blogView', { slug });
  }

  getBlogPopularityMap(): Record<string, number> {
    const raw = this.storage.get<unknown>(ContentService.BLOG_POPULARITY_KEY);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

    const parsed = raw as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [slug, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        out[slug] = Math.floor(value);
      }
    }
    return out;
  }

  // Settings
  getSettings(): Observable<SiteSettings> {
    return this.http
      .get<unknown>(this.base + '/settings')
      .pipe(map((res) => normalizeSettingsSingleton(res)));
  }

  // Testimonials (admin: all + pending)
  submitTestimonial(t: Partial<Testimonial>): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      environment.api.baseUrl + '/admin' + '/testimonials/submit',
      t,
    );
  }

  // Blog

  // Analytics

  trackEvent(event: string, meta?: Record<string, unknown>): void {
    this.http
      .post(this.base + '/analytics/track', { event, ...meta })
      .subscribe({
        error: (err) => this.reportClientError('analytics.track', err, { event, meta }),
      });
  }

  /** Record a resume-gate lead. Fire-and-forget — never blocks the download. */
  trackResumeLead(email: string): void {
    this.http
      .post(this.base + '/resume-lead', { email })
      .subscribe({ error: (err) => this.reportClientError('resume.lead', err) });
  }

  trackResumeFunnel(stage: ResumeFunnelStage, source: string): void {
    const normalizedSource = (source || 'unknown').trim().toLowerCase();
    const events = this.getResumeFunnelEvents();
    events.push({ ts: Date.now(), stage, source: normalizedSource });

    if (events.length > ContentService.RESUME_FUNNEL_LIMIT) {
      events.splice(0, events.length - ContentService.RESUME_FUNNEL_LIMIT);
    }

    this.storage.set(ContentService.RESUME_FUNNEL_KEY, events);
    this.trackEvent('resumeFunnel', { stage, source: normalizedSource });
  }

  getResumeFunnelSummary(timeframeDays = 30): ResumeFunnelSummary {
    const days = Math.max(1, Math.floor(timeframeDays));
    const windowStart = Date.now() - days * 24 * 60 * 60 * 1000;
    const inWindow = this.getResumeFunnelEvents().filter((event) => event.ts >= windowStart);

    const totals = {
      views: inWindow.filter((event) => event.stage === 'view').length,
      clicks: inWindow.filter((event) => event.stage === 'click').length,
      downloads: inWindow.filter((event) => event.stage === 'download').length,
    };

    const grouped = new Map<string, { views: number; clicks: number; downloads: number }>();
    for (const event of inWindow) {
      if (!grouped.has(event.source)) {
        grouped.set(event.source, { views: 0, clicks: 0, downloads: 0 });
      }
      const bucket = grouped.get(event.source)!;
      if (event.stage === 'view') bucket.views += 1;
      else if (event.stage === 'click') bucket.clicks += 1;
      else bucket.downloads += 1;
    }

    const bySource = Array.from(grouped.entries())
      .map(([source, values]) => ({
        source,
        views: values.views,
        clicks: values.clicks,
        downloads: values.downloads,
        clickToDownloadRate: values.clicks > 0 ? (values.downloads / values.clicks) * 100 : 0,
      }))
      .sort((a, b) => b.downloads - a.downloads || b.clicks - a.clicks || a.source.localeCompare(b.source));

    return { timeframeDays: days, totals, bySource };
  }

  getVisitorCount(): Observable<{ thisMonth: number; lastMonth: number }> {
    return this.http.get<{ thisMonth: number; lastMonth: number }>(
      this.base + '/analytics/visitor-count',
    );
  }

  // Image upload (returns { url: '/uploads/filename.ext' })
  uploadImage(fileName: string, fileData: string): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(this.base + '/upload-image', { fileName, fileData });
  }

  deleteUploadedImage(url: string): Observable<void> {
    return this.http.request<void>('DELETE', this.base + '/upload-image', {
      body: { url },
    });
  }

  // Reorder
  reorder(section: string, items: { id: string; displayOrder: number }[]): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(this.base + '/reorder/' + section, items);
  }

  private reportClientError(source: string, err: unknown, meta?: Record<string, unknown>): void {
    const payload = {
      source,
      message: err instanceof Error ? err.message : String(err),
      context: meta,
      ts: Date.now(),
    };

    this.http.post(`${environment.api.baseUrl}/track/error`, payload).subscribe({
      error: () => {
        if (!environment.production) console.error('[content-service]', payload);
      },
    });
  }

  private toDateMs(rawValue: string | undefined): number {
    if (!rawValue) return 0;
    const ms = Date.parse(rawValue);
    return Number.isFinite(ms) ? ms : 0;
  }

  private getResumeFunnelEvents(): ResumeFunnelEvent[] {
    const raw = this.storage.get<unknown>(ContentService.RESUME_FUNNEL_KEY);
    if (!Array.isArray(raw)) return [];

    return raw
      .filter((entry): entry is ResumeFunnelEvent => {
        if (!entry || typeof entry !== 'object') return false;
        const candidate = entry as Partial<ResumeFunnelEvent>;
        return (
          typeof candidate.ts === 'number' &&
          typeof candidate.source === 'string' &&
          (candidate.stage === 'view' ||
            candidate.stage === 'click' ||
            candidate.stage === 'download')
        );
      })
      .sort((a, b) => a.ts - b.ts);
  }
}
