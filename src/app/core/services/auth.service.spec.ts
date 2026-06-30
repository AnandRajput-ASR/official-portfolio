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
  let localStore: Record<string, string>;
  let sessionStore: Record<string, string>;
  const originalCookieAuth = environment.cookieAuth;

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
    });

    it('starts signed out with no stored token', () => {
      create();
      expect(service.isLoggedInSnapshot()).toBeFalse();
      expect(service.currentUser()).toBeNull();
    });

    it('stores the token and user, and marks logged in, on login', () => {
      create();
      service.login('admin', 'secret').subscribe();
      const req = http.expectOne(`${environment.api.baseUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      req.flush({ token: 'jwt-token', username: 'admin', role: 'admin' });

      expect(service.getToken()).toBe('jwt-token');
      expect(service.currentUser()).toEqual({ username: 'admin', role: 'admin' });
      expect(service.isLoggedInSnapshot()).toBeTrue();
      expect(sessionStore['ar-portfolio:token']).toBe(JSON.stringify('jwt-token'));
      expect(localStore['ar-portfolio:token']).toBeUndefined();
    });

    it('clears storage and navigates home on logout', () => {
      create();
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
      create();
      sessionStore['ar-portfolio:user'] = JSON.stringify({ username: 'admin', role: 'admin' });
      service.probeSession().subscribe((user) => {
        expect(user).toEqual({ username: 'admin', role: 'admin' });
        done();
      });
      http.expectNone(`${environment.api.baseUrl}/auth/me`);
    });

    it('migrates a legacy persistent token into session storage when bootstrapping', () => {
      localStore['ar-portfolio:token'] = JSON.stringify('jwt-token');
      localStore['ar-portfolio:user'] = JSON.stringify({ username: 'admin', role: 'admin' });

      create();

      expect(service.getToken()).toBe('jwt-token');
      expect(sessionStore['ar-portfolio:token']).toBe(JSON.stringify('jwt-token'));
      expect(localStore['ar-portfolio:token']).toBeUndefined();
    });
  });

  describe('cookie mode', () => {
    beforeEach(() => {
      environment.cookieAuth = true;
    });

    it('getToken always returns null (token is HttpOnly)', () => {
      create();
      expect(service.getToken()).toBeNull();
    });

    it('login sends credentials and marks logged in without reading a token', () => {
      create();
      service.login('admin', 'secret').subscribe();
      const req = http.expectOne(`${environment.api.baseUrl}/auth/login`);
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ username: 'admin', role: 'admin' });

      expect(service.getToken()).toBeNull();
      expect(service.isLoggedInSnapshot()).toBeTrue();
      expect(service.currentUser()).toEqual({ username: 'admin', role: 'admin' });
    });

    it('probeSession marks logged in when /auth/me succeeds', (done) => {
      create();
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
      create();
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
