import { TestBed } from '@angular/core/testing';
import { AuditLogService } from './audit-log.service';
import { StorageService } from './storage.service';

describe('AuditLogService', () => {
  const STORAGE_KEY = 'audit-log-events';
  let service: AuditLogService;
  let storage: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    storage = TestBed.inject(StorageService);
    storage.remove(STORAGE_KEY);
  });

  it('starts empty', () => {
    service = TestBed.inject(AuditLogService);
    expect(service.events()).toEqual([]);
  });

  it('appends events in order', () => {
    service = TestBed.inject(AuditLogService);
    service.log('hero', 'save', 'first save');
    service.log('blog', 'add', 'added post');
    const events = service.events();
    expect(events.length).toBe(2);
    expect(events[0].tab).toBe('hero');
    expect(events[1].tab).toBe('blog');
    expect(events[1].summary).toBe('added post');
  });

  it('assigns monotonic ids', () => {
    service = TestBed.inject(AuditLogService);
    service.log('hero', 'save', 'a');
    service.log('hero', 'save', 'b');
    const [a, b] = service.events();
    expect(b.id).toBeGreaterThan(a.id);
  });

  it('caps the buffer at 200 entries', () => {
    service = TestBed.inject(AuditLogService);
    for (let i = 0; i < 250; i++) service.log('hero', 'save', `e${i}`);
    expect(service.events().length).toBe(200);
    // The most recent entries are preserved (FIFO eviction).
    expect(service.events()[199].summary).toBe('e249');
  });

  it('clear() empties the buffer', () => {
    service = TestBed.inject(AuditLogService);
    service.log('hero', 'save', 'a');
    service.clear();
    expect(service.events()).toEqual([]);
  });

  it('persists events to local storage', () => {
    service = TestBed.inject(AuditLogService);
    service.log('hero', 'save', 'persisted event');

    const stored = storage.get<unknown[]>(STORAGE_KEY) ?? [];
    expect(stored.length).toBe(1);
  });

  it('restores events from local storage on startup', () => {
    storage.set(STORAGE_KEY, [
      {
        id: 7,
        ts: 1700000000000,
        tab: 'blog',
        action: 'add',
        summary: 'restored event',
      },
    ]);

    service = TestBed.inject(AuditLogService);
    const events = service.events();
    expect(events.length).toBe(1);
    expect(events[0].id).toBe(7);
    expect(events[0].summary).toBe('restored event');
  });

  it('clear() removes persisted storage entry', () => {
    service = TestBed.inject(AuditLogService);
    service.log('hero', 'save', 'a');

    service.clear();

    expect(storage.get(STORAGE_KEY)).toBeNull();
  });
});
