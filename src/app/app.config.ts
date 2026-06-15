import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  inject,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { authInterceptor } from '@core/interceptors/auth.interceptor';
import { AuthService } from '@core/services/auth.service';
import { GlobalErrorHandler } from '@core/services/global-error-handler';
import { ObservabilityService } from '@core/services/observability.service';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // Probe the backend for an active session at boot. In cookie mode
    // this is the only way to know if the user is signed in. In legacy
    // mode it's a no-op that just returns the localStorage user.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).probeSession())),
    // Boot web-vitals collection. Idempotent — safe to call from
    // multiple initialisers in dev hot-reload scenarios.
    provideAppInitializer(() => inject(ObservabilityService).init()),
  ],
};
