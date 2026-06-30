import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;
  let localStore: Record<string, string>;
  let sessionStore: Record<string, string>;

  beforeEach(() => {
    localStore = {};
    sessionStore = {};
    spyOn(Storage.prototype, 'getItem').and.callFake(function (this: Storage, k: string) {
      return this === window.sessionStorage ? sessionStore[k] ?? null : localStore[k] ?? null;
    });
    spyOn(Storage.prototype, 'setItem').and.callFake(function (this: Storage, k: string, v: string) {
      if (this === window.sessionStorage) {
        sessionStore[k] = v;
        return;
      }
      localStore[k] = v;
    });
    spyOn(Storage.prototype, 'removeItem').and.callFake(function (this: Storage, k: string) {
      if (this === window.sessionStorage) {
        delete sessionStore[k];
        return;
      }
      delete localStore[k];
    });
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
  });

  it('round-trips a JSON-serialisable value', () => {
    service.set('theme', 'dark');
    expect(service.get('theme')).toBe('dark');
  });

  it('round-trips an object', () => {
    const payload = { id: '1', tags: ['a', 'b'] };
    service.set('payload', payload);
    expect(service.get<typeof payload>('payload')).toEqual(payload);
  });

  it('returns null for a missing key', () => {
    expect(service.get('nope')).toBeNull();
  });

  it('returns null on a JSON-parse failure', () => {
    localStore['ar-portfolio:bad'] = '{not json';
    expect(service.get('bad')).toBeNull();
  });

  it('removes a key', () => {
    service.set('theme', 'dark');
    service.remove('theme');
    expect(service.get('theme')).toBeNull();
  });

  it('namespaces keys so a wildcard wipe is safe', () => {
    service.set('a', 1);
    const rawKeys = Object.keys(localStore);
    expect(rawKeys.every((k) => k.startsWith('ar-portfolio:'))).toBeTrue();
  });

  it('round-trips a session-scoped value', () => {
    service.setSession('token', 'jwt');
    expect(service.getSession('token')).toBe('jwt');
    expect(service.get('token')).toBeNull();
  });

  it('removes only the session-scoped value when requested', () => {
    service.set('theme', 'dark');
    service.setSession('token', 'jwt');
    service.removeSession('token');

    expect(service.getSession('token')).toBeNull();
    expect(service.get('theme')).toBe('dark');
  });

  it('respects TTL — returns null after expiry', () => {
    service.setWithExpiry('soon', { v: 1 }, -1);
    expect(service.getWithExpiry('soon')).toBeNull();
  });

  it('respects TTL — returns the value before expiry', () => {
    service.setWithExpiry('later', { v: 1 }, 60_000);
    expect(service.getWithExpiry('later')).toEqual({ v: 1 });
  });

  it('silently survives when localStorage throws (Safari private mode)', () => {
    (Storage.prototype.setItem as jasmine.Spy).and.throwError('QuotaExceeded');
    expect(() => service.set('k', 'v')).not.toThrow();
    expect(service.get('k')).toBeNull();
  });
});
