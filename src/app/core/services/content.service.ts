import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PortfolioContent, SiteSettings, Testimonial } from '@core/models';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ContentService {
  private http = inject(HttpClient);

  private base = environment.api.baseUrl + '/content';

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
    return this.http.get<PortfolioContent>(this.base + '/page-content');
  }

  // Settings
  getSettings(): Observable<SiteSettings> {
    return this.http.get<SiteSettings>(this.base + '/settings');
  }

  // Testimonials (admin: all + pending)
  submitTestimonial(t: Partial<Testimonial>): Observable<any> {
    return this.http.post(environment.api.baseUrl + '/admin' + '/testimonials/submit', t);
  }

  // Blog

  // Analytics

  trackEvent(event: string, meta?: Record<string, unknown>): void {
    this.http
      .post(this.base + '/analytics/track', { event, ...meta })
      .subscribe({ error: () => {} });
  }

  /** Record a resume-gate lead. Fire-and-forget — never blocks the download. */
  trackResumeLead(email: string): void {
    this.http.post(this.base + '/resume-lead', { email }).subscribe({ error: () => {} });
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
  reorder(section: string, items: { id: string; displayOrder: number }[]): Observable<any> {
    return this.http.put(this.base + '/reorder/' + section, items);
  }
}
