import { Injectable, signal } from '@angular/core';

export interface AuditEvent {
  id: number;
  ts: number;
  tab: string;
  action: 'save' | 'delete' | 'add' | 'revert' | 'upload';
  summary: string;
}

/**
 * Tiny ring buffer of the most recent admin actions.
 *
 * Every save / delete / add in the admin tabs calls `log()` so
 * there's a recoverable audit trail in the sidebar. We don't
 * persist to the backend — the admin is single-user and the
 * backend already logs the underlying HTTP request. The point
 * of this buffer is "what did *I* do in the last 30 minutes",
 * not "what happened on the server".
 */
@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private static readonly BUFFER_SIZE = 200;
  private buffer: AuditEvent[] = [];
  private nextId = 1;
  readonly events = signal<AuditEvent[]>([]);

  log(tab: string, action: AuditEvent['action'], summary: string): void {
    this.buffer.push({
      id: this.nextId++,
      ts: Date.now(),
      tab,
      action,
      summary,
    });
    if (this.buffer.length > AuditLogService.BUFFER_SIZE) {
      this.buffer.shift();
    }
    this.events.set([...this.buffer]);
  }

  clear(): void {
    this.buffer = [];
    this.events.set([]);
  }
}
