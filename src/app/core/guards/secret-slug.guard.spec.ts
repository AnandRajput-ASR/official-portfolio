import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, UrlSegment, UrlTree } from '@angular/router';
import { StorageService } from '@core/services/storage.service';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { ADMIN_LOGIN_ENTRY_KEY, secretSlugGuard } from './secret-slug.guard';

describe('secretSlugGuard', () => {
  let router: jasmine.SpyObj<Router>;
  let http: HttpTestingController;
  let storage: StorageService;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['parseUrl']);
    router.parseUrl.and.callFake((url: string) => ({ toString: () => url } as UrlTree));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(StorageService);
    storage.removeSession(ADMIN_LOGIN_ENTRY_KEY);
  });

  afterEach(() => {
    storage.removeSession(ADMIN_LOGIN_ENTRY_KEY);
    http.verify();
  });

  function run(slug: string): Observable<boolean | UrlTree> {
    const url = [new UrlSegment(slug, {})];
    const result = TestBed.runInInjectionContext(() => secretSlugGuard({} as never, url));
    return result as unknown as Observable<boolean | UrlTree>;
  }

  it('rejects slugs that fail the client-side pattern without an HTTP call', (done) => {
    run('not-a-secret').subscribe((result) => {
      expect((result as UrlTree).toString()).toBe('/');
      done();
    });
    http.expectNone(`${environment.api.baseUrl}/admin/verify-slug/not-a-secret`);
  });

  it('redirects valid slugs to /admin/login and stores a short-lived grant', (done) => {
    run('secure-portal-ar2026').subscribe((result) => {
      expect((result as UrlTree).toString()).toBe('/admin/login');
      const grantedAt = storage.getSession<number>(ADMIN_LOGIN_ENTRY_KEY);
      expect(typeof grantedAt).toBe('number');
      done();
    });
    http
      .expectOne(`${environment.api.baseUrl}/admin/verify-slug/secure-portal-ar2026`)
      .flush({ valid: true });
  });

  it('rejects a valid-pattern slug the backend does not recognise', (done) => {
    run('secure-wrong').subscribe((result) => {
      expect((result as UrlTree).toString()).toBe('/');
      done();
    });
    http.expectOne(`${environment.api.baseUrl}/admin/verify-slug/secure-wrong`).flush({
      valid: false,
    });
  });

  it('rejects and redirects home when the backend call errors', (done) => {
    run('secure-portal-ar2026').subscribe((result) => {
      expect((result as UrlTree).toString()).toBe('/');
      done();
    });
    http
      .expectOne(`${environment.api.baseUrl}/admin/verify-slug/secure-portal-ar2026`)
      .flush(null, { status: 500, statusText: 'Server Error' });
  });
});
