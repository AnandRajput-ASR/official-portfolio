import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { environment } from '@env/environment';

/**
 * Attaches a `Bearer` token to outgoing requests when one is available.
 *
 * In cookie mode (`environment.cookieAuth === true`) there is no token
 * to attach — the browser sends the session cookie automatically. The
 * interceptor becomes a no-op so we never accidentally read or store a
 * token from JS.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.cookieAuth) {
    const isApiRequest = req.url.startsWith(environment.api.baseUrl);
    if (isApiRequest && !req.withCredentials) {
      req = req.clone({ withCredentials: true });
    }
    return next(req);
  }
  const token = inject(AuthService).getToken();
  const isApiRequest = req.url.startsWith(environment.api.baseUrl);
  const isPublicContentRequest = req.url.startsWith(`${environment.api.baseUrl}/content`);

  if (token && isApiRequest && !isPublicContentRequest) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
  return next(req);
};
