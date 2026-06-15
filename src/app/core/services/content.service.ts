import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResponse, BlogPost, PortfolioContent, SiteSettings, Testimonial } from '@core/models';
import { normalizePortfolioContent, normalizeSettingsSingleton } from '@core/utils/wave2-compat';
import { environment } from '@env/environment';
import { map, Observable, shareReplay } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ContentService {
  private http = inject(HttpClient);

  private base = environment.api.baseUrl + '/content';
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
      this.cachedContent$ = this.getAll().pipe(shareReplay({ bufferSize: 1, refCount: true }));
    }
    return this.cachedContent$;
  }

  getPublishedBlogPosts(): Observable<BlogPost[]> {
    return this.getAllCached().pipe(
      map((content) =>
        (content.blogPosts ?? [])
          .filter((p) => p.published && p.is_deleted !== true)
          .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')),
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
            (p) => p.slug === slug && p.published && p.is_deleted !== true,
          ) ?? null,
      })),
    );
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
}
