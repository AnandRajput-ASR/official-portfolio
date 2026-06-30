import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@core/services/auth.service';
import { environment } from '@env/environment';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  const originalCookieAuth = environment.cookieAuth;

  function setup(): void {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getToken']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    environment.cookieAuth = originalCookieAuth;
    httpMock?.verify();
  });

  describe('legacy (token) mode', () => {
    beforeEach(() => {
      environment.cookieAuth = false;
      setup();
    });

    it('attaches a Bearer token when one is available', () => {
      auth.getToken.and.returnValue('jwt-token');
      httpClient.get(`${environment.api.baseUrl}/admin/page-content`).subscribe();
      const req = httpMock.expectOne(`${environment.api.baseUrl}/admin/page-content`);
      expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
      req.flush({});
    });

    it('does not attach an Authorization header when there is no token', () => {
      auth.getToken.and.returnValue(null);
      httpClient.get(`${environment.api.baseUrl}/content`).subscribe();
      const req = httpMock.expectOne(`${environment.api.baseUrl}/content`);
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({});
    });
  });

  describe('cookie mode', () => {
    beforeEach(() => {
      environment.cookieAuth = true;
      setup();
    });

    it('sends credentials for API requests and never adds a Bearer token', () => {
      httpClient.get(`${environment.api.baseUrl}/content`).subscribe();
      const req = httpMock.expectOne(`${environment.api.baseUrl}/content`);
      expect(req.request.withCredentials).toBeTrue();
      expect(req.request.headers.has('Authorization')).toBeFalse();
      expect(auth.getToken).not.toHaveBeenCalled();
      req.flush({});
    });
  });
});
