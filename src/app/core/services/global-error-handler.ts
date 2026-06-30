import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ObservabilityService } from './observability.service';

/**
 * Global Angular ErrorHandler. Catches every uncaught exception
 * inside the Angular zone, sends it to the backend via
 * ObservabilityService, then forwards to the default handler so
 * the dev experience in `ng serve` is unchanged.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private observability = inject(ObservabilityService);
  private readonly defaultHandler = new ErrorHandler();

  handleError(error: unknown): void {
    this.observability.captureError(error, { source: 'angular-error-handler' });
    this.defaultHandler.handleError(error);
  }
}
