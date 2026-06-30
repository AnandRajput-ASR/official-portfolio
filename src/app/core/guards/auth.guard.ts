import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

/**
 * Route guard for the admin dashboard. Implemented as `CanMatchFn`
 * (not `CanActivateFn`) so the guard runs *before* the lazy chunk is
 * fetched. In cookie mode we trust the BehaviourSubject seeded by
 * `AuthService.probeSession()`; in legacy mode the JWT-in-localStorage
 * path stays.
 */
export const authGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedInSnapshot()) return true;
  // Redirect home — the login page lives behind the secret slug.
  router.navigate(['/']);
  return false;
};
