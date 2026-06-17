import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';

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
 * there's a recoverable audit trail in the sidebar. Events are
 * persisted to local storage so the feed survives refresh, but
 * we still do not persist to the backend. The point of this
 * buffer is "what did *I* do recently", not "what happened
 * on the server".
 */
@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private static readonly BUFFER_SIZE = 200;
  private static readonly STORAGE_KEY = 'audit-log-events';
  private storage = inject(StorageService);
  private buffer: AuditEvent[] = [];
  private nextId = 1;
  readonly events = signal<AuditEvent[]>([]);

  constructor() {
    this.restore();
  }

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
    this.persist();
  }

  clear(): void {
    this.buffer = [];
    this.nextId = 1;
    this.events.set([]);
    this.storage.remove(AuditLogService.STORAGE_KEY);
  }

  private persist(): void {
    this.storage.set(AuditLogService.STORAGE_KEY, this.buffer);
  }

  private restore(): void {
    const raw = this.storage.get<unknown>(AuditLogService.STORAGE_KEY);
    if (!Array.isArray(raw)) return;

    const restored = raw
      .filter((entry): entry is AuditEvent => this.isValidAuditEvent(entry))
      .slice(-AuditLogService.BUFFER_SIZE);

    this.buffer = restored;
    this.nextId =
      restored.reduce((max, event) => Math.max(max, event.id), 0) + 1;
    this.events.set([...this.buffer]);
  }

  private isValidAuditEvent(value: unknown): value is AuditEvent {
    if (!value || typeof value !== 'object') return false;
    const event = value as Partial<AuditEvent>;
    return (
      typeof event.id === 'number' &&
      typeof event.ts === 'number' &&
      typeof event.tab === 'string' &&
      typeof event.summary === 'string' &&
      (event.action === 'save' ||
        event.action === 'delete' ||
        event.action === 'add' ||
        event.action === 'revert' ||
        event.action === 'upload')
    );
  }
}
