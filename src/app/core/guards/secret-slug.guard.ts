import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment } from '@angular/router';
import { StorageService } from '@core/services/storage.service';
import { environment } from '@env/environment';
import { catchError, map, of } from 'rxjs';

const VALID_SLUG_PATTERN = /^secure-[a-z0-9-]+$/;
export const ADMIN_LOGIN_ENTRY_KEY = 'admin-login-entry-granted-at';

/**
 * Validates a secret admin-entry URL slug against the backend.
 *
 * Hardening:
 *  1. Slugs are pattern-checked client-side first; the HTTP call only
 *     fires for plausible slugs, saving a round-trip on mistypes.
 *  2. On success we create a short-lived session grant and redirect to
 *     `/admin/login` so the slug itself is never needed beyond entry.
 *
 * The slug is read from `url` (the matched UrlSegment[]) rather than
 * `route.params` so this works as a `CanMatchFn` against the wildcard
 * `:slug` route.
 */
export const secretSlugGuard: CanMatchFn = (_route, url: UrlSegment[]) => {
  const http = inject(HttpClient);
  const router = inject(Router);
  const storage = inject(StorageService);
  const slug = url[0]?.path ?? '';

  if (!VALID_SLUG_PATTERN.test(slug)) {
    return of(router.parseUrl('/'));
  }

  return http.get<{ valid: boolean }>(`${environment.api.baseUrl}/admin/verify-slug/${slug}`).pipe(
    map((res) => {
      if (res.valid) {
        storage.setSession(ADMIN_LOGIN_ENTRY_KEY, Date.now());
        return router.parseUrl('/admin/login');
      }
      return router.parseUrl('/');
    }),
    catchError(() => of(router.parseUrl('/'))),
  );
};
