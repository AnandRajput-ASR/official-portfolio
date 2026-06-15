import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedInSnapshot']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  function run(): boolean {
    return TestBed.runInInjectionContext(() => authGuard({} as never, []) as boolean);
  }

  it('allows access when the user is signed in', () => {
    auth.isLoggedInSnapshot.and.returnValue(true);
    expect(run()).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('blocks access and redirects home when the user is signed out', () => {
    auth.isLoggedInSnapshot.and.returnValue(false);
    expect(run()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
