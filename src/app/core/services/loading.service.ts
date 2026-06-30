import { computed, Injectable, signal } from '@angular/core';

/**
 * Global loading service.
 * Usage anywhere:
 *   loadingService.start('key')   — register a loading source
 *   loadingService.stop('key')    — mark that source as done
 *   loadingService.isLoading()    — true if ANY source is still loading
 *
 * Multiple concurrent calls are safe — the screen stays up until
 * every caller has called stop().
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly active = signal<Set<string>>(new Set());

  readonly isLoading = computed(() => this.active().size > 0);

  start(key: string): void {
    this.active.update((s) => new Set(s).add(key));
  }

  stop(key: string): void {
    this.active.update((s) => {
      const next = new Set(s);
      next.delete(key);
      return next;
    });
  }

  stopAll(): void {
    this.active.set(new Set());
  }
}
