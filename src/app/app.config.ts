import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  APP_INITIALIZER,
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
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
    {
      // Probe the backend for an active session at boot. In cookie mode
      // this is the only way to know if the user is signed in. In legacy
      // mode it's a no-op that just returns the localStorage user.
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (auth: AuthService) => () => firstValueFrom(auth.probeSession()),
      deps: [AuthService],
    },
    {
      // Boot web-vitals collection. Idempotent — safe to call from
      // multiple initialisers in dev hot-reload scenarios.
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (obs: ObservabilityService) => () => obs.init(),
      deps: [ObservabilityService],
    },
  ],
};
