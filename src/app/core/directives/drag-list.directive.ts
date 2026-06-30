import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  Renderer2,
  inject,
} from '@angular/core';

/**
 * DragListDirective — attach to a container, each child with [draggable="true"]
 * and [data-drag-id] will be draggable. Emits reordered id array on drop.
 *
 * Usage:
 *   <div appDragList (reordered)="onReorder($event)">
 *     <div draggable="true" [attr.data-drag-id]="item.id" *ngFor="...">
 */
@Directive({ selector: '[appDragList]', standalone: true })
export class DragListDirective {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);

  @Input() dragHandleSelector: string | null = null;

  @Output() reordered = new EventEmitter<string[]>();

  private dragSrcId: string | null = null;
  private lastPointerDownTarget: HTMLElement | null = null;

  private getItems(): HTMLElement[] {
    return Array.from(this.el.nativeElement.querySelectorAll('[data-drag-id]'));
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(e: MouseEvent) {
    this.lastPointerDownTarget = e.target as HTMLElement;
  }

  @HostListener('dragstart', ['$event'])
  onDragStart(e: DragEvent) {
    const dragTarget = e.target as HTMLElement;
    const dragOrigin = this.lastPointerDownTarget || dragTarget;

    const isInteractive = !!dragOrigin.closest(
      'input, textarea, select, button, a, label, [contenteditable="true"]',
    );
    if (isInteractive) {
      e.preventDefault();
      return;
    }

    const target = dragTarget.closest('[data-drag-id]') as HTMLElement;
    if (!target) return;

    if (this.dragHandleSelector) {
      const handle = dragOrigin.closest(this.dragHandleSelector);
      if (!handle || !target.contains(handle)) {
        e.preventDefault();
        return;
      }
    }

    this.dragSrcId = target.dataset['dragId'] || null;
    this.renderer.addClass(target, 'dragging');
    e.dataTransfer!.effectAllowed = 'move';
    // Some browsers require setData for drag/drop to start reliably.
    e.dataTransfer?.setData('text/plain', this.dragSrcId || '');
  }

  @HostListener('dragend')
  onDragEnd() {
    this.lastPointerDownTarget = null;
    this.getItems().forEach((el) => {
      this.renderer.removeClass(el, 'dragging');
      this.renderer.removeClass(el, 'drag-over');
    });
  }

  @HostListener('dragover', ['$event'])
  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    const target = (e.target as HTMLElement).closest('[data-drag-id]') as HTMLElement;
    this.getItems().forEach((el) => this.renderer.removeClass(el, 'drag-over'));
    if (target && target.dataset['dragId'] !== this.dragSrcId) {
      this.renderer.addClass(target, 'drag-over');
    }
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(e: DragEvent) {
    const target = (e.target as HTMLElement).closest('[data-drag-id]') as HTMLElement;
    if (target) this.renderer.removeClass(target, 'drag-over');
  }

  @HostListener('drop', ['$event'])
  onDrop(e: DragEvent) {
    e.preventDefault();
    const target = (e.target as HTMLElement).closest('[data-drag-id]') as HTMLElement;
    const srcId = this.dragSrcId || e.dataTransfer?.getData('text/plain') || null;
    if (!target || !srcId) return;

    const destId = target.dataset['dragId'];
    if (destId === srcId) return;

    // Reorder the actual DOM items to get new sequence
    const items = this.getItems();
    const ids = items.map((el) => el.dataset['dragId'] as string);
    const srcIdx = ids.indexOf(srcId);
    const dstIdx = ids.indexOf(destId!);
    if (srcIdx < 0 || dstIdx < 0) return;

    ids.splice(srcIdx, 1);
    ids.splice(dstIdx, 0, srcId);

    this.reordered.emit(ids);
    this.dragSrcId = null;
    this.lastPointerDownTarget = null;
    this.getItems().forEach((el) => this.renderer.removeClass(el, 'drag-over'));
  }

  // ── Touch support (mobile drag-reorder) ────────────────────────────────────
  private touchSrcEl: HTMLElement | null = null;
  private touchMoved = false;

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent) {
    const origin = e.target as HTMLElement;
    const isInteractive = !!origin.closest(
      'input, textarea, select, button, a, label, [contenteditable="true"]',
    );
    if (isInteractive) return;

    const target = origin.closest('[data-drag-id]') as HTMLElement;
    if (!target) return;

    if (this.dragHandleSelector) {
      const handle = origin.closest(this.dragHandleSelector);
      if (!handle || !target.contains(handle)) return;
    }

    this.touchSrcEl = target;
    this.touchMoved = false;
    this.dragSrcId = target.dataset['dragId'] || null;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(e: TouchEvent) {
    if (!this.touchSrcEl || !this.dragSrcId) return;
    // Suppress page scroll only once an actual reorder drag is underway.
    if (e.cancelable) e.preventDefault();
    if (!this.touchMoved) {
      this.touchMoved = true;
      this.renderer.addClass(this.touchSrcEl, 'dragging');
    }

    const touch = e.touches[0];
    const over = (
      document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null
    )?.closest('[data-drag-id]') as HTMLElement | null;

    this.getItems().forEach((el) => this.renderer.removeClass(el, 'drag-over'));
    if (over && over.dataset['dragId'] !== this.dragSrcId) {
      this.renderer.addClass(over, 'drag-over');
    }
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(e: TouchEvent) {
    const srcEl = this.touchSrcEl;
    const srcId = this.dragSrcId;
    this.touchSrcEl = null;
    this.dragSrcId = null;

    const cleanup = () => {
      this.getItems().forEach((el) => {
        this.renderer.removeClass(el, 'dragging');
        this.renderer.removeClass(el, 'drag-over');
      });
    };

    if (!srcEl || !srcId || !this.touchMoved) {
      cleanup();
      return;
    }

    const touch = e.changedTouches[0];
    const destEl = (
      document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null
    )?.closest('[data-drag-id]') as HTMLElement | null;
    const destId = destEl?.dataset['dragId'];

    if (destId && destId !== srcId) {
      const ids = this.getItems().map((el) => el.dataset['dragId'] as string);
      const srcIdx = ids.indexOf(srcId);
      const dstIdx = ids.indexOf(destId);
      if (srcIdx >= 0 && dstIdx >= 0) {
        ids.splice(srcIdx, 1);
        ids.splice(dstIdx, 0, srcId);
        this.reordered.emit(ids);
      }
    }
    cleanup();
  }
}
