import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '@env/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  let store: Record<string, string>;
  const originalCookieAuth = environment.cookieAuth;

  beforeEach(() => {
    store = {};
    spyOn(Storage.prototype, 'getItem').and.callFake((k: string) => store[k] ?? null);
    spyOn(Storage.prototype, 'setItem').and.callFake((k: string, v: string) => {
      store[k] = v;
    });
    spyOn(Storage.prototype, 'removeItem').and.callFake((k: string) => {
      delete store[k];
    });
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
  });

  afterEach(() => {
    environment.cookieAuth = originalCookieAuth;
    http?.verify();
  });

  function create(): void {
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  }

  describe('legacy (token) mode', () => {
    beforeEach(() => {
      environment.cookieAuth = false;
      create();
    });

    it('starts signed out with no stored token', () => {
      expect(service.isLoggedInSnapshot()).toBeFalse();
      expect(service.currentUser()).toBeNull();
    });

    it('stores the token and user, and marks logged in, on login', () => {
      service.login('admin', 'secret').subscribe();
      const req = http.expectOne(`${environment.api.baseUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      req.flush({ token: 'jwt-token', username: 'admin', role: 'admin' });

      expect(service.getToken()).toBe('jwt-token');
      expect(service.currentUser()).toEqual({ username: 'admin', role: 'admin' });
      expect(service.isLoggedInSnapshot()).toBeTrue();
    });

    it('clears storage and navigates home on logout', () => {
      service.login('admin', 'secret').subscribe();
      http.expectOne(`${environment.api.baseUrl}/auth/login`).flush({
        token: 'jwt-token',
        username: 'admin',
        role: 'admin',
      });

      service.logout();

      expect(service.getToken()).toBeNull();
      expect(service.isLoggedInSnapshot()).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('probeSession returns the stored user without an HTTP call', (done) => {
      store['ar-portfolio:user'] = JSON.stringify({ username: 'admin', role: 'admin' });
      service.probeSession().subscribe((user) => {
        expect(user).toEqual({ username: 'admin', role: 'admin' });
        done();
      });
      http.expectNone(`${environment.api.baseUrl}/auth/me`);
    });
  });

  describe('cookie mode', () => {
    beforeEach(() => {
      environment.cookieAuth = true;
      create();
    });

    it('getToken always returns null (token is HttpOnly)', () => {
      expect(service.getToken()).toBeNull();
    });

    it('login sends credentials and marks logged in without reading a token', () => {
      service.login('admin', 'secret').subscribe();
      const req = http.expectOne(`${environment.api.baseUrl}/auth/login`);
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ username: 'admin', role: 'admin' });

      expect(service.getToken()).toBeNull();
      expect(service.isLoggedInSnapshot()).toBeTrue();
      expect(service.currentUser()).toEqual({ username: 'admin', role: 'admin' });
    });

    it('probeSession marks logged in when /auth/me succeeds', (done) => {
      service.probeSession().subscribe(() => {
        expect(service.isLoggedInSnapshot()).toBeTrue();
        expect(service.currentUser()).toEqual({ username: 'admin', role: 'admin' });
        done();
      });
      const req = http.expectOne(`${environment.api.baseUrl}/auth/me`);
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ username: 'admin', role: 'admin' });
    });

    it('probeSession marks logged out when /auth/me fails', (done) => {
      service.probeSession().subscribe((user) => {
        expect(user).toBeNull();
        expect(service.isLoggedInSnapshot()).toBeFalse();
        done();
      });
      http
        .expectOne(`${environment.api.baseUrl}/auth/me`)
        .flush(null, { status: 401, statusText: 'Unauthorized' });
    });
  });
});
