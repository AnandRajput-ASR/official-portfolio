import { signal } from '@angular/core';

/**
 * `prefersReducedMotion()` — a signal that tracks the OS-level
 * "reduce motion" preference and updates when the user toggles it
 * (macOS / iOS / Windows all expose this in their accessibility
 * settings). Use this in your components to skip non-essential
 * animation when the user has explicitly opted out:
 *
 *   if (!prefersReducedMotion()) startCounterAnimation(el);
 *
 * Also exported as the `appReducedMotion` directive that applies
 * a `.no-motion` class to the host element so CSS can opt out.
 */

function createMatcher(): MediaQueryList | null {
  if (typeof window === 'undefined' || !window.matchMedia) return null;
  return window.matchMedia('(prefers-reduced-motion: reduce)');
}

const initial = createMatcher()?.matches ?? false;
export const prefersReducedMotion = signal<boolean>(initial);

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const mq = createMatcher();
  if (mq) {
    const update = (ev: MediaQueryListEvent | MediaQueryList) =>
      prefersReducedMotion.set(ev.matches);
    mq.addEventListener('change', update);
  }
}
