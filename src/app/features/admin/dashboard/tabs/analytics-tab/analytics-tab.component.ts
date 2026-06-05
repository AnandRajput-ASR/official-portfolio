import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Analytics } from '@core/models';
import { AdminService } from '@core/services/admin.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@shared/components/toast/toast.component';

@Component({
  selector: 'app-analytics-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics-tab.component.html',
  styleUrl: './analytics-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsTabComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  analytics: Analytics | null = null;
  analyticsLoading = false;

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.analyticsLoading = true;
    this.adminService.getAnalytics().subscribe({
      next: (res: any) => {
        this.analytics = res.data ?? res;
        this.analyticsLoading = false;
      },
      error: () => {
        this.analyticsLoading = false;
        this.toast.error('Could not load analytics');
      },
    });
  }

  async resetAnalytics(): Promise<void> {
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
    this.adminService.resetAnalytics().subscribe({
      next: () => {
        this.loadAnalytics();
        this.toast.success('Analytics reset to zero');
      },
      error: () => this.toast.error('Reset failed'),
    });
  }

  topProjectClicks(): { name: string; clicks: number }[] {
    if (!this.analytics?.projectClicks) return [];
    return Object.entries(this.analytics.projectClicks)
      .map(([name, clicks]) => ({ name, clicks: clicks as number }))
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
    for (const d of this.analytics?.dailyVisits ?? []) map.set(d.date, d.count);
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
}
