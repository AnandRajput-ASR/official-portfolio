import { TestBed } from '@angular/core/testing';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuditLogService);
  });

  it('starts empty', () => {
    expect(service.events()).toEqual([]);
  });

  it('appends events in order', () => {
    service.log('hero', 'save', 'first save');
    service.log('blog', 'add', 'added post');
    const events = service.events();
    expect(events.length).toBe(2);
    expect(events[0].tab).toBe('hero');
    expect(events[1].tab).toBe('blog');
    expect(events[1].summary).toBe('added post');
  });

  it('assigns monotonic ids', () => {
    service.log('hero', 'save', 'a');
    service.log('hero', 'save', 'b');
    const [a, b] = service.events();
    expect(b.id).toBeGreaterThan(a.id);
  });

  it('caps the buffer at 200 entries', () => {
    for (let i = 0; i < 250; i++) service.log('hero', 'save', `e${i}`);
    expect(service.events().length).toBe(200);
    // The most recent entries are preserved (FIFO eviction).
    expect(service.events()[199].summary).toBe('e249');
  });

  it('clear() empties the buffer', () => {
    service.log('hero', 'save', 'a');
    service.clear();
    expect(service.events()).toEqual([]);
  });
});
