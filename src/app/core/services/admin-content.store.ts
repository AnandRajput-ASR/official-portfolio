import { inject, Injectable, signal } from '@angular/core';
import { ActiveTab, PortfolioContent, Testimonial } from '@core/models';
import { ContentService } from '@core/services/content.service';

/**
 * Shared signal-based source of truth for the admin dashboard.
 *
 * The dashboard was originally a single monolithic component. As tabs are
 * extracted into standalone child components, this store holds the state that
 * must stay in sync between the parent shell (unsaved-changes guard, sidebar
 * dirty-dots, Ctrl+S shortcut) and the individual tab components.
 */
@Injectable({ providedIn: 'root' })
export class AdminContentStore {
  private readonly contentService = inject(ContentService);

  /** The loaded portfolio content — the saved source of truth. */
  readonly content = signal<PortfolioContent | null>(null);

  /** True while any tab is persisting a save. */
  readonly saving = signal(false);

  /** Tabs with unsaved edits. Plain Set — read under default change detection. */
  readonly dirtyTabs = new Set<ActiveTab>();

  /**
   * Signal-friendly count of dirty tabs. Tabs call `markDirty` /
   * `clearDirty` directly on the Set, then call `bumpDirty()` so any
   * template that reads `dirty()` re-renders. Bare Set mutation is not
   * signal-tracked; this counter is.
   */
  private readonly dirtyCount = signal(0);
  readonly dirty = this.dirtyCount.asReadonly();

  /**
   * Pending testimonial submissions, surfaced as the sidebar badge.
   * Updated by the testimonials tab whenever it loads.
   */
  readonly pendingTestimonials = signal<Testimonial[]>([]);

  /** Per-tab save handlers registered by extracted child tabs for Ctrl+S. */
  private readonly savers = new Map<ActiveTab, () => void>();

  markDirty(tab: ActiveTab): void {
    const wasNew = !this.dirtyTabs.has(tab);
    this.dirtyTabs.add(tab);
    if (wasNew) this.bumpDirty();
  }

  clearDirty(tab: ActiveTab): void {
    const had = this.dirtyTabs.delete(tab);
    if (had) {
      this.bumpDirty();
      this.contentService.invalidateCache();
    }
  }

  isDirty(tab: ActiveTab): boolean {
    return this.dirtyTabs.has(tab);
  }

  /** Force the dirty-count signal to recompute from the underlying Set. */
  private bumpDirty(): void {
    this.dirtyCount.set(this.dirtyTabs.size);
  }

  /** Registers a save handler so the parent's Ctrl+S shortcut can reach an
   *  extracted tab. Call from the child's ngOnInit. */
  registerSaver(tab: ActiveTab, fn: () => void): void {
    this.savers.set(tab, fn);
  }

  /** Removes a previously registered save handler. Call from ngOnDestroy. */
  unregisterSaver(tab: ActiveTab): void {
    this.savers.delete(tab);
  }

  getSaver(tab: ActiveTab): (() => void) | undefined {
    return this.savers.get(tab);
  }
}
