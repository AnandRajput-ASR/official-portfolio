import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Analytics, DailyVisit } from '@core/models';
import { AdminService } from '@core/services/admin.service';
import { ConfirmService } from '@core/services/confirm.service';
import { LoadingService } from '@core/services/loading.service';
import { ToastService } from '@shared/components/toast/toast.component';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-analytics-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics-tab.component.html',
  styleUrl: './analytics-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsTabComponent implements OnInit {
  private static readonly MIN_LOADER_MS = 450;

  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly loadingService = inject(LoadingService);
  private readonly cdr = inject(ChangeDetectorRef);

  analytics: Analytics | null = null;
  analyticsLoading = false;

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    const loaderKey = 'admin-analytics-load';
    const startedAt = Date.now();
    this.analyticsLoading = true;
    this.loadingService.start(loaderKey);
    this.adminService
      .getAnalytics()
      .pipe(
        finalize(() => {
          this.stopLoadersWithMinimumDuration(loaderKey, startedAt);
        }),
      )
      .subscribe({
      next: (res: Analytics) => {
        this.analytics = res;
      },
      error: () => {
        this.analytics = null;
        this.toast.error('Could not load analytics');
      },
    });
  }

  async resetAnalytics(): Promise<void> {
    const loaderKey = 'admin-analytics-reset';
    const startedAt = Date.now();
    const ok = await this.confirm.ask({
      title: 'Reset Analytics',
      message:
        'All counters — page views, downloads, clicks — will be set back to zero. <br><br>This cannot be undone.',
      confirmText: 'Reset All',
      cancelText: 'Keep Data',
      type: 'warning',
      icon: '📊',
    });
    if (!ok) return;
    this.loadingService.start(loaderKey);
    this.adminService
      .resetAnalytics()
      .pipe(finalize(() => this.stopLoaderWithMinimumDuration(loaderKey, startedAt)))
      .subscribe({
        next: () => {
          this.loadAnalytics();
          this.toast.success('Analytics reset to zero');
        },
        error: () => this.toast.error('Reset failed'),
      });
  }

  topProjectClicks(): { name: string; clicks: number }[] {
    const projectClicks = this.analytics?.projectClicks;
    if (!projectClicks || typeof projectClicks !== 'object' || Array.isArray(projectClicks)) {
      return [];
    }
    return Object.entries(projectClicks)
      .map(([name, clicks]) => ({ name, clicks: Number(clicks) || 0 }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
  }

  conversionRate(): string {
    const v = this.analytics?.contactFormViews || 0,
      s = this.analytics?.contactFormSubmissions || 0;
    if (!v) return '—';
    return ((s / v) * 100).toFixed(1) + '%';
  }

  /** Returns zero-filled 30-day visit array ready for the bar chart. */
  visitChartBars(): { date: string; count: number; label: string }[] {
    const days = 30;
    const map = new Map<string, number>();
    const visits = Array.isArray(this.analytics?.dailyVisits)
      ? (this.analytics?.dailyVisits as DailyVisit[])
      : [];
    for (const d of visits) {
      if (!d?.date) continue;
      map.set(d.date, Number(d.count) || 0);
    }
    const bars: { date: string; count: number; label: string }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      bars.push({ date: key, count: map.get(key) ?? 0, label });
    }
    return bars;
  }

  visitChartMax(): number {
    return Math.max(1, ...this.visitChartBars().map((b) => b.count));
  }

  /** Returns a +/- delta string vs last month. */
  monthDelta(): string {
    const cur = this.analytics?.thisMonth ?? 0;
    const prev = this.analytics?.lastMonth ?? 0;
    if (!prev) return cur > 0 ? '+' + cur + ' new' : '—';
    const diff = cur - prev;
    const pct = Math.round((Math.abs(diff) / prev) * 100);
    return (diff >= 0 ? '+' : '') + diff + ' (' + (diff >= 0 ? '+' : '') + pct + '% vs last month)';
  }

  today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private stopLoadersWithMinimumDuration(loaderKey: string, startedAt: number): void {
    this.stopLoaderWithMinimumDuration(loaderKey, startedAt, () => {
      this.analyticsLoading = false;
      this.cdr.markForCheck();
    });
  }

  private stopLoaderWithMinimumDuration(
    loaderKey: string,
    startedAt: number,
    afterStop?: () => void,
  ): void {
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, AnalyticsTabComponent.MIN_LOADER_MS - elapsed);

    if (remaining === 0) {
      this.loadingService.stop(loaderKey);
      afterStop?.();
      return;
    }

    setTimeout(() => {
      this.loadingService.stop(loaderKey);
      afterStop?.();
    }, remaining);
  }
}
