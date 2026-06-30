import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { onLCP, onINP, onCLS, onFCP, onTTFB, Metric } from 'web-vitals';
import { environment } from '@env/environment';
import { ContentService } from './content.service';

export interface WebVitalSample {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  ts: number;
}

/**
 * Frontend observability hub.
 *
 * Three responsibilities:
 *   1. Forward every unhandled error to the backend
 *      (so Sentry-style alerting is one backend hook away).
 *   2. Report web-vitals to the backend on every session.
 *   3. Provide a `track()` helper that other services use to
 *      forward custom events.
 *
 * Sentry integration is intentionally NOT bundled — the backend
 * is the right place to decide where errors go, and the frontend
 * shouldn't pull in a 60 KB SDK to call a single POST. The contract
 * here is "we POST to `/api/track`" and the backend can decide
 * whether that means Sentry, Logflare, or stdout.
 */
@Injectable({ providedIn: 'root' })
export class ObservabilityService {
  private http = inject(HttpClient);
  private contentService = inject(ContentService);

  /** Last 50 web-vitals, surfaced in the admin's analytics tab. */
  readonly vitals = signal<WebVitalSample[]>([]);
  /** Sentry-style user identity. */
  readonly userId = signal<string | null>(null);

  private static readonly VITALS_BUFFER = 50;
  private vitalsBuffer: WebVitalSample[] = [];

  init(): void {
    if (typeof window === 'undefined') return;
    const handler = (m: Metric) => {
      this.vitalsBuffer.push({
        name: m.name,
        value: Math.round(m.value),
        rating: m.rating,
        ts: Date.now(),
      });
      if (this.vitalsBuffer.length > ObservabilityService.VITALS_BUFFER) {
        this.vitalsBuffer.shift();
      }
      this.vitals.set([...this.vitalsBuffer]);

      // Forward to backend so it can ship to Sentry / log / etc.
      this.contentService.trackEvent('webVital', { name: m.name, value: m.value });
    };
    onLCP(handler);
    onINP(handler);
    onCLS(handler);
    onFCP(handler);
    onTTFB(handler);
  }

  /** Forward an error to the backend's error sink. */
  captureError(err: unknown, context?: Record<string, unknown>): void {
    const payload = {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      context,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      ts: Date.now(),
    };
    if (!environment.production) {
      console.error('[observability]', payload);
    }
    this.http
      .post(`${environment.api.baseUrl}/track/error`, payload)
      .subscribe({ error: () => undefined });
  }

  /** Track a custom event. */
  track(name: string, props?: Record<string, unknown>): void {
    this.contentService.trackEvent(name, props);
  }

  setUser(id: string | null): void {
    this.userId.set(id);
  }
}
