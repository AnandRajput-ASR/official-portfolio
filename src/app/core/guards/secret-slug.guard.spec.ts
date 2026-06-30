import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, UrlSegment } from '@angular/router';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { secretSlugGuard } from './secret-slug.guard';

describe('secretSlugGuard', () => {
  let router: jasmine.SpyObj<Router>;
  let http: HttpTestingController;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function run(slug: string): Observable<boolean> {
    const url = [new UrlSegment(slug, {})];
    const result = TestBed.runInInjectionContext(() => secretSlugGuard({} as never, url));
    return result as unknown as Observable<boolean>;
  }

  it('rejects slugs that fail the client-side pattern without an HTTP call', (done) => {
    run('not-a-secret').subscribe((allowed) => {
      expect(allowed).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
      done();
    });
    http.expectNone(`${environment.api.baseUrl}/admin/verify-slug/not-a-secret`);
  });

  it('allows a valid slug confirmed by the backend and rewrites history', (done) => {
    const replaceState = spyOn(history, 'replaceState');
    run('secure-portal-ar2026').subscribe((allowed) => {
      expect(allowed).toBeTrue();
      expect(replaceState).toHaveBeenCalledWith({}, '', '/admin/login');
      done();
    });
    http
      .expectOne(`${environment.api.baseUrl}/admin/verify-slug/secure-portal-ar2026`)
      .flush({ valid: true });
  });

  it('rejects a valid-pattern slug the backend does not recognise', (done) => {
    run('secure-wrong').subscribe((allowed) => {
      expect(allowed).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
      done();
    });
    http.expectOne(`${environment.api.baseUrl}/admin/verify-slug/secure-wrong`).flush({
      valid: false,
    });
  });

  it('rejects and redirects home when the backend call errors', (done) => {
    run('secure-portal-ar2026').subscribe((allowed) => {
      expect(allowed).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
      done();
    });
    http
      .expectOne(`${environment.api.baseUrl}/admin/verify-slug/secure-portal-ar2026`)
      .flush(null, { status: 500, statusText: 'Server Error' });
  });
});
