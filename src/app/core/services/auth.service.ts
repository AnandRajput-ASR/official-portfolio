import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthResponse } from '@core/models';
import { AuditLogService } from '@core/services/audit-log.service';
import { environment } from '@env/environment';
import { catchError, Observable, of, tap } from 'rxjs';
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
 *    in the login response body and stored in `sessionStorage` only.
 *    This fallback keeps local development working without leaving a
 *    long-lived bearer token in persistent browser storage.
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
  private audit = inject(AuditLogService);

  /**
   * Single source of truth for auth state. Reactive current-user info;
   * null when signed out. Login state is derived from this signal.
   */
  readonly currentUser = signal<{ username: string; role: string } | null>(this.initialUser());

  /** Derived login state. True whenever a current user is present. */
  private readonly loggedIn = computed(() => this.currentUser() !== null);

  /** Observable view of `loggedIn`, for consumers that need a stream. */
  private readonly loggedIn$ = toObservable(this.loggedIn);

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
          this.storage.setSession(AuthService.TOKEN_KEY, res.token);
          this.storage.setSession(AuthService.USER_KEY, { username: res.username, role: res.role });
          this.clearLegacyPersistentAuth();
          this.markLoggedIn(res.username, res.role);
        }),
      );
  }

  logout(): void {
    this.audit.log('account', 'revert', 'Logged out admin session');
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
      this.clearStoredAuth();
      this.markLoggedOut();
      this.router.navigate(['/']);
    }
  }

  private clearLocalSession(): void {
    this.clearStoredAuth();
    this.markLoggedOut();
    this.router.navigate(['/']);
  }

  /** Returns the stored JWT, or null. Cookie mode always returns null. */
  getToken(): string | null {
    if (environment.cookieAuth) return null;
    const v = this.readStoredToken();
    return v ?? null;
  }

  getUsername(): string {
    const user = this.readStoredUser();
    if (user?.username) return user.username;
    return this.currentUser()?.username ?? 'admin';
  }

  isLoggedIn(): Observable<boolean> {
    return this.loggedIn$;
  }

  isLoggedInSnapshot(): boolean {
    return this.loggedIn();
  }

  /**
   * Probes the backend for an active session. Call once at app start.
   * In cookie mode this is the source of truth; in legacy mode the
   * BehaviourSubject already has the right value from localStorage.
   */
  probeSession(): Observable<{ username: string; role: string } | null> {
    if (!environment.cookieAuth) {
      const user = this.readStoredUser();
      return of(user ?? null);
    }
    return this.http
      .get<{ username: string; role: string }>(`${environment.api.baseUrl}/auth/me`, {
        withCredentials: true,
      })
      .pipe(
        tap({
          next: (u) => this.markLoggedIn(u.username, u.role),
          error: () => this.markLoggedOut(),
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
      ).pipe(tap(() => this.audit.log('account', 'save', 'Changed account credentials')));
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
            this.storage.setSession(AuthService.TOKEN_KEY, res.token);
            this.storage.setSession(AuthService.USER_KEY, { username: res.username, role: res.role });
            this.clearLegacyPersistentAuth();
          }
          this.audit.log('account', 'save', 'Changed account credentials');
        }),
      );
  }

  forgotPassword(): Observable<ForgotPasswordResponse> {
    return this.http
      .post<ForgotPasswordResponse>(`${environment.api.baseUrl}/auth/forgot-password`, {})
      .pipe(tap(() => this.audit.log('account', 'save', 'Generated password reset token')));
  }

  resetPassword(token: string, newPassword: string): Observable<{ message?: string }> {
    return this.http
      .post<{ message?: string }>(`${environment.api.baseUrl}/auth/reset-password`, {
        token,
        newPassword,
      })
      .pipe(tap(() => this.audit.log('account', 'save', 'Completed password reset with token')));
  }

  /**
   * Seeds the current user at construction. Cookie mode can't know until
   * the first `/me` call, so it starts null. Legacy mode trusts a valid,
   * unexpired JWT in storage and restores the stored user.
   */
  private initialUser(): { username: string; role: string } | null {
    if (environment.cookieAuth) return null;
    this.migrateLegacyPersistentAuth();
    if (!this.hasValidSession()) return null;
    return this.readStoredUser();
  }

  private hasValidSession(): boolean {
    const token = this.readStoredToken();
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
  }

  private markLoggedOut(): void {
    this.currentUser.set(null);
  }

  private readStoredToken(): string | null {
    return this.storage.getSession<string>(AuthService.TOKEN_KEY);
  }

  private readStoredUser(): { username: string; role: string } | null {
    return this.storage.getSession<{ username: string; role: string }>(AuthService.USER_KEY);
  }

  private clearStoredAuth(): void {
    this.storage.removeSession(AuthService.TOKEN_KEY);
    this.storage.removeSession(AuthService.USER_KEY);
    this.clearLegacyPersistentAuth();
  }

  private clearLegacyPersistentAuth(): void {
    this.storage.remove(AuthService.TOKEN_KEY);
    this.storage.remove(AuthService.USER_KEY);
  }

  private migrateLegacyPersistentAuth(): void {
    const legacyToken = this.storage.get<string>(AuthService.TOKEN_KEY);
    const legacyUser = this.storage.get<{ username: string; role: string }>(AuthService.USER_KEY);

    if (legacyToken) {
      this.storage.setSession(AuthService.TOKEN_KEY, legacyToken);
    }
    if (legacyUser) {
      this.storage.setSession(AuthService.USER_KEY, legacyUser);
    }
    if (legacyToken || legacyUser) {
      this.clearLegacyPersistentAuth();
    }
  }
}
