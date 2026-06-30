import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuditEvent, AuditLogService } from '@core/services/audit-log.service';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="tab-content">
      <div class="tab-header">
        <div>
          <h1>Audit Log</h1>
          <p>Recent admin actions — {{ filteredEvents().length }} of {{ audit.events().length }} shown.</p>
        </div>
        <div class="al-header-actions">
          <button class="btn btn-outline btn-sm" (click)="exportCsv()" [disabled]="filteredEvents().length === 0">
            ↓ Export CSV
          </button>
          <button class="btn btn-outline btn-sm" (click)="audit.clear()">Clear All</button>
        </div>
      </div>

      <!-- Filters row -->
      <div class="al-filters" *ngIf="audit.events().length > 0">
        <div class="al-filter-group">
          <label class="al-filter-label">Time</label>
          <div class="al-filter-btns">
            <button
              class="btn btn-outline btn-xs"
              [class.is-active]="timeFilter === 'all'"
              (click)="timeFilter = 'all'"
            >All</button>
            <button
              class="btn btn-outline btn-xs"
              [class.is-active]="timeFilter === '1h'"
              (click)="timeFilter = '1h'"
            >Last 1h</button>
            <button
              class="btn btn-outline btn-xs"
              [class.is-active]="timeFilter === 'today'"
              (click)="timeFilter = 'today'"
            >Today</button>
          </div>
        </div>
        <div class="al-filter-group">
          <label class="al-filter-label">Action</label>
          <div class="al-filter-btns">
            <button
              class="btn btn-outline btn-xs"
              [class.is-active]="actionFilter === 'all'"
              (click)="actionFilter = 'all'"
            >All</button>
            <button
              *ngFor="let a of actionTypes"
              class="btn btn-outline btn-xs"
              [class.is-active]="actionFilter === a"
              (click)="actionFilter = a"
            >{{ a }}</button>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="audit.events().length === 0">
        <span>📜</span>
        <p>No admin actions logged yet.</p>
      </div>

      <div class="al-empty-filter" *ngIf="audit.events().length > 0 && filteredEvents().length === 0">
        <p>No events match the current filters.</p>
      </div>

      <ol class="al-list" *ngIf="filteredEvents().length > 0">
        <li *ngFor="let e of filteredEvents()" class="al-item">
          <span class="al-action" [attr.data-action]="e.action">{{ e.action }}</span>
          <span class="al-tab">{{ e.tab }}</span>
          <span class="al-summary">{{ e.summary }}</span>
          <time class="al-time">{{ e.ts | date: 'MMM d, h:mm a' }}</time>
        </li>
      </ol>
    </section>
  `,
  styleUrls: ['./audit-log.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DatePipe],
})
export class AuditLogComponent {
  protected audit = inject(AuditLogService);
  private datePipe = inject(DatePipe);

  timeFilter: 'all' | '1h' | 'today' = 'all';
  actionFilter: AuditEvent['action'] | 'all' = 'all';
  readonly actionTypes: AuditEvent['action'][] = ['save', 'add', 'delete', 'revert', 'upload'];

  filteredEvents(): AuditEvent[] {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return this.audit
      .events()
      .slice()
      .reverse()
      .filter((e) => {
        if (this.timeFilter === '1h' && e.ts < now - 3_600_000) return false;
        if (this.timeFilter === 'today' && e.ts < todayStart.getTime()) return false;
        if (this.actionFilter !== 'all' && e.action !== this.actionFilter) return false;
        return true;
      });
  }

  exportCsv(): void {
    const events = this.filteredEvents();
    if (!events.length) return;
    const headers = ['Timestamp', 'Tab', 'Action', 'Summary'];
    const rows = events.map((e) => [
      this.datePipe.transform(e.ts, 'yyyy-MM-dd HH:mm:ss') ?? '',
      e.tab,
      e.action,
      e.summary,
    ]);
    const csv = [headers, ...rows]
      .map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
