import { Directive, ElementRef, OnDestroy, effect, inject } from '@angular/core';
import { prefersReducedMotion } from '@core/utils/reduced-motion';

/**
 * Apply `.no-motion` to the host element whenever the OS
 * "reduce motion" preference is on. CSS authors can then write:
 *
 *   .no-motion * { animation: none !important; transition: none !important; }
 *
 * to honour the user's choice globally.
 */
@Directive({
  selector: '[appReducedMotion]',
  standalone: true,
})
export class ReducedMotionDirective implements OnDestroy {
  private el = inject(ElementRef<HTMLElement>);

  constructor() {
    effect(() => {
      const on = prefersReducedMotion();
      this.el.nativeElement.classList.toggle('no-motion', on);
    });
  }

  ngOnDestroy(): void {
    this.el.nativeElement.classList.remove('no-motion');
  }
}
