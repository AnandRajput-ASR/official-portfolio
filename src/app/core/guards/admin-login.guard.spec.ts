import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { StorageService } from '@core/services/storage.service';
import { ADMIN_LOGIN_ENTRY_KEY } from './secret-slug.guard';
import { adminLoginGuard } from './admin-login.guard';

describe('adminLoginGuard', () => {
  let router: jasmine.SpyObj<Router>;
  let auth: jasmine.SpyObj<AuthService>;
  let storage: StorageService;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['parseUrl']);
    router.parseUrl.and.callFake((url: string) => ({ toString: () => url } as UrlTree));

    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedInSnapshot']);

    TestBed.configureTestingModule({
      providers: [
        StorageService,
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: auth },
      ],
    });

    storage = TestBed.inject(StorageService);
    storage.removeSession(ADMIN_LOGIN_ENTRY_KEY);
  });

  afterEach(() => {
    storage.removeSession(ADMIN_LOGIN_ENTRY_KEY);
  });

  it('allows logged-in admins', () => {
    auth.isLoggedInSnapshot.and.returnValue(true);
    const result = TestBed.runInInjectionContext(() => adminLoginGuard({} as never, []));
    expect(result).toBeTrue();
  });

  it('allows signed-out users when a fresh grant exists', () => {
    auth.isLoggedInSnapshot.and.returnValue(false);
    storage.setSession(ADMIN_LOGIN_ENTRY_KEY, Date.now());

    const result = TestBed.runInInjectionContext(() => adminLoginGuard({} as never, []));

    expect(result).toBeTrue();
  });

  it('redirects home when there is no grant', () => {
    auth.isLoggedInSnapshot.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => adminLoginGuard({} as never, []));

    expect((result as UrlTree).toString()).toBe('/');
  });

  it('redirects home and clears stale grants', () => {
    auth.isLoggedInSnapshot.and.returnValue(false);
    storage.setSession(ADMIN_LOGIN_ENTRY_KEY, Date.now() - 11 * 60 * 1000);

    const result = TestBed.runInInjectionContext(() => adminLoginGuard({} as never, []));

    expect((result as UrlTree).toString()).toBe('/');
    expect(storage.getSession(ADMIN_LOGIN_ENTRY_KEY)).toBeNull();
  });
});
