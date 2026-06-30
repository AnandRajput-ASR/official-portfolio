import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { StorageService } from '@core/services/storage.service';
import { ADMIN_LOGIN_ENTRY_KEY } from './secret-slug.guard';

const ADMIN_LOGIN_ENTRY_TTL_MS = 10 * 60 * 1000;

/**
 * Allows `/admin/login` only after a valid secret-slug verification.
 * Logged-in admins are always allowed so refreshes remain stable.
 */
export const adminLoginGuard: CanMatchFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const storage = inject(StorageService);

  if (auth.isLoggedInSnapshot()) {
    return true;
  }

  const grantedAt = storage.getSession<number>(ADMIN_LOGIN_ENTRY_KEY);
  if (typeof grantedAt !== 'number') {
    return router.parseUrl('/');
  }

  if (Date.now() - grantedAt > ADMIN_LOGIN_ENTRY_TTL_MS) {
    storage.removeSession(ADMIN_LOGIN_ENTRY_KEY);
    return router.parseUrl('/');
  }

  return true;
};
