import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { environment } from '@env/environment';
import { take } from 'rxjs';

export type HealthStatus = 'healthy' | 'degraded' | 'unreachable' | 'unknown';

export interface HealthSnapshot {
  status: HealthStatus;
  /** Round-trip latency in ms; null when not yet measured or unreachable. */
  latencyMs: number | null;
  /** When the last probe was made. */
  lastChecked: number | null;
}

/**
 * Polls `GET /api/health` periodically while the admin is open.
 * The backend endpoint is a one-liner — return 200 if the
 * database is reachable, 503 otherwise. The result feeds the
 * "Backend: healthy 12 ms" pill in the dashboard sidebar.
 */
@Injectable({ providedIn: 'root' })
export class HealthService implements OnDestroy {
  private http = inject(HttpClient);

  /** Reactive snapshot for the sidebar pill. */
  readonly snapshot = signal<HealthSnapshot>({
    status: 'unknown',
    latencyMs: null,
    lastChecked: null,
  });

  private intervalId: ReturnType<typeof setInterval> | null = null;

  start(intervalMs = 30_000): void {
    if (this.intervalId) return;
    this.probe();
    this.intervalId = setInterval(() => this.probe(), intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }

  /** Force a probe now (e.g. on the "Retry" button). */
  probe(): void {
    const t0 = Date.now();
    this.http.get(`${environment.api.baseUrl}/health`).pipe(take(1)).subscribe({
      next: () => {
        this.snapshot.set({
          status: 'healthy',
          latencyMs: Date.now() - t0,
          lastChecked: Date.now(),
        });
      },
      error: () => {
        this.snapshot.set({
          status: 'unreachable',
          latencyMs: null,
          lastChecked: Date.now(),
        });
      },
    });
  }
}
