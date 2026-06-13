import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthResponse } from '@core/models';
import { environment } from '@env/environment';
import { BehaviorSubject, catchError, Observable, of, tap } from 'rxjs';
import { StorageService } from './storage.service';

interface ForgotPasswordResponse {
  emailSent?: boolean;
  email?: string;
  resetToken?: string;
  message?: string;
}

/**
 * Two authentication modes, selected by `environment.cookieAuth`:
 *
 *  - **Cookie mode** (preferred, `cookieAuth: true`): the backend sets
 *    `HttpOnly; Secure; SameSite=Lax` session + refresh cookies on login.
 *    This service does not read or store tokens; it just asks `GET
 *    /api/auth/me` to know if the user is signed in. Tokens are
 *    inaccessible to JS, which closes the entire XSS-→-token-theft
 *    attack surface.
 *
 *  - **Legacy mode** (default, `cookieAuth: false`): the JWT is returned
 *    in the login response body and stored in `localStorage`. Will be
 *    removed once the backend cookie path is deployed.
 *
 * Either way the contract the rest of the app sees is identical:
 * `login` returns an Observable, `isLoggedInSnapshot` returns a boolean,
 * `logout` clears state and navigates home.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly TOKEN_KEY = 'token';
  private static readonly USER_KEY = 'user';

  private http = inject(HttpClient);
  private router = inject(Router);
  private storage = inject(StorageService);

  private loggedIn$ = new BehaviorSubject<boolean>(this.hasValidSession());
  /** Reactive current-user info; null when signed out. */
  readonly currentUser = signal<{ username: string; role: string } | null>(null);

  login(username: string, password: string): Observable<AuthResponse> {
    if (environment.cookieAuth) {
      // Cookie is set by the response; ignore the body.
      return this.http
        .post<AuthResponse>(
          `${environment.api.baseUrl}/auth/login`,
          { username, password },
          { withCredentials: true },
        )
        .pipe(tap(() => this.markLoggedIn(username)));
    }
    return this.http
      .post<AuthResponse>(`${environment.api.baseUrl}/auth/login`, { username, password })
      .pipe(
        tap((res) => {
          this.storage.set(AuthService.TOKEN_KEY, res.token);
          this.storage.set(AuthService.USER_KEY, { username: res.username, role: res.role });
          this.markLoggedIn(res.username, res.role);
        }),
      );
  }

  logout(): void {
    if (environment.cookieAuth) {
      // Best-effort: tell the backend to clear cookies. Always continue
      // to local cleanup even if the call fails.
      this.http
        .post(`${environment.api.baseUrl}/auth/logout`, {}, { withCredentials: true })
        .subscribe({
          error: () => this.clearLocalSession(),
          complete: () => this.clearLocalSession(),
        });
    } else {
      this.storage.remove(AuthService.TOKEN_KEY);
      this.storage.remove(AuthService.USER_KEY);
      this.markLoggedOut();
      this.router.navigate(['/']);
    }
  }

  private clearLocalSession(): void {
    this.markLoggedOut();
    this.router.navigate(['/']);
  }

  /** Returns the stored JWT, or null. Cookie mode always returns null. */
  getToken(): string | null {
    if (environment.cookieAuth) return null;
    const v = this.storage.get<string>(AuthService.TOKEN_KEY);
    return v ?? null;
  }

  getUsername(): string {
    const user = this.storage.get<{ username: string }>(AuthService.USER_KEY);
    if (user?.username) return user.username;
    return this.currentUser()?.username ?? 'admin';
  }

  isLoggedIn(): Observable<boolean> {
    return this.loggedIn$.asObservable();
  }

  isLoggedInSnapshot(): boolean {
    return this.loggedIn$.value;
  }

  /**
   * Probes the backend for an active session. Call once at app start.
   * In cookie mode this is the source of truth; in legacy mode the
   * BehaviourSubject already has the right value from localStorage.
   */
  probeSession(): Observable<{ username: string; role: string } | null> {
    if (!environment.cookieAuth) {
      const user = this.storage.get<{ username: string; role: string }>(AuthService.USER_KEY);
      return of(user ?? null);
    }
    return this.http
      .get<{ username: string; role: string }>(`${environment.api.baseUrl}/auth/me`, {
        withCredentials: true,
      })
      .pipe(
        tap({
          next: (u) => {
            this.markLoggedIn(u.username, u.role);
            this.loggedIn$.next(true);
          },
          error: () => {
            this.markLoggedOut();
            this.loggedIn$.next(false);
          },
        }),
        catchError(() => of(null)),
      );
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
    newUsername?: string,
  ): Observable<AuthResponse> {
    if (environment.cookieAuth) {
      // The backend rotates the session cookie in the response; we just
      // observe success and let the caller log the user back in.
      return this.http.put<AuthResponse>(
        `${environment.api.baseUrl}/auth/change-password`,
        {
          currentPassword,
          newPassword,
          newUsername,
        },
        { withCredentials: true },
      );
    }
    return this.http
      .put<AuthResponse>(`${environment.api.baseUrl}/auth/change-password`, {
        currentPassword,
        newPassword,
        newUsername,
      })
      .pipe(
        tap((res) => {
          if (res.token) {
            this.storage.set(AuthService.TOKEN_KEY, res.token);
            this.storage.set(AuthService.USER_KEY, { username: res.username, role: res.role });
          }
        }),
      );
  }

  forgotPassword(): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${environment.api.baseUrl}/auth/forgot-password`, {});
  }

  resetPassword(token: string, newPassword: string): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(`${environment.api.baseUrl}/auth/reset-password`, {
      token,
      newPassword,
    });
  }

  private hasValidSession(): boolean {
    if (environment.cookieAuth) {
      // We can't know until the first /me call. Optimistically false.
      return false;
    }
    const token = this.storage.get<string>(AuthService.TOKEN_KEY);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  private markLoggedIn(username: string, role = 'admin'): void {
    this.currentUser.set({ username, role });
    this.loggedIn$.next(true);
  }

  private markLoggedOut(): void {
    this.currentUser.set(null);
    this.loggedIn$.next(false);
  }
}
