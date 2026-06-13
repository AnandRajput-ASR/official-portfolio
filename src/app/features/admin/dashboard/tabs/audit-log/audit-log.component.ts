import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuditLogService } from '@core/services/audit-log.service';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="tab-content">
      <div class="tab-header">
        <div>
          <h1>Audit Log</h1>
          <p>Recent admin actions — last {{ audit.events().length }} events.</p>
        </div>
        <button class="btn btn-outline btn-sm" (click)="audit.clear()">Clear</button>
      </div>

      <div class="empty-state" *ngIf="audit.events().length === 0">
        <span>📋</span>
        <p>No admin actions logged yet.</p>
      </div>

      <ol class="al-list" *ngIf="audit.events().length > 0">
        <li *ngFor="let e of audit.events().slice().reverse()" class="al-item">
          <span class="al-action" [attr.data-action]="e.action">{{ e.action }}</span>
          <span class="al-tab">{{ e.tab }}</span>
          <span class="al-summary">{{ e.summary }}</span>
          <time class="al-time">{{ e.ts | date: 'short' }}</time>
        </li>
      </ol>
    </section>
  `,
  styleUrls: ['./audit-log.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogComponent {
  protected audit = inject(AuditLogService);
}
