import { Injectable, signal } from '@angular/core';
import { ConfirmConfig } from '@shared/components/confirm-dialog/confirm-dialog.component';

/**
 * Centralised confirm-dialog state so any component (parent dashboard or an
 * extracted tab) can request a confirmation and await the user's choice.
 *
 * Render a single `<app-confirm-dialog>` bound to this service near the root of
 * the admin shell:
 *
 *   <app-confirm-dialog
 *     [visible]="confirm.visible()"
 *     [config]="confirm.config()"
 *     (confirm)="confirm.yes()"
 *     (cancel)="confirm.no()">
 *   </app-confirm-dialog>
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly visible = signal(false);
  readonly config = signal<ConfirmConfig | null>(null);

  private resolver: ((value: boolean) => void) | null = null;

  /** Show the dialog and resolve with the user's choice. */
  ask(config: ConfirmConfig): Promise<boolean> {
    this.config.set(config);
    this.visible.set(true);
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  yes(): void {
    this.close(true);
  }

  no(): void {
    this.close(false);
  }

  private close(result: boolean): void {
    this.visible.set(false);
    const resolve = this.resolver;
    this.resolver = null;
    resolve?.(result);
  }
}
