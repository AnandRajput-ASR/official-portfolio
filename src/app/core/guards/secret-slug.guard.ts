import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { map, catchError, of } from 'rxjs';
import { environment } from '@env/environment';

const VALID_SLUG_PATTERN = /^secure-[a-z0-9-]+$/;

/**
 * Validates a secret admin-entry URL slug against the backend.
 *
 * Hardening:
 *  1. Slugs are pattern-checked client-side first; the HTTP call only
 *     fires for plausible slugs, saving a round-trip on mistypes.
 *  2. On success the browser history is rewritten to `/admin/login` so
 *     the secret URL doesn't persist in the user's history (and so a
 *     shareable URL never leaks the slug).
 *
 * The slug is read from `url` (the matched UrlSegment[]) rather than
 * `route.params` so this works as a `CanMatchFn` against the wildcard
 * `:slug` route.
 */
export const secretSlugGuard: CanMatchFn = (_route, url: UrlSegment[]) => {
  const http = inject(HttpClient);
  const router = inject(Router);
  const slug = url[0]?.path ?? '';

  if (!VALID_SLUG_PATTERN.test(slug)) {
    router.navigate(['/']);
    return of(false);
  }

  return http.get<{ valid: boolean }>(`${environment.api.baseUrl}/admin/verify-slug/${slug}`).pipe(
    map((res) => {
      if (res.valid) {
        if (typeof history !== 'undefined') {
          history.replaceState({}, '', '/admin/login');
        }
        return true;
      }
      router.navigate(['/']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/']);
      return of(false);
    }),
  );
};
