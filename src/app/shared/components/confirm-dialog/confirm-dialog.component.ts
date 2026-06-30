import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { sanitizeHtml } from '@core/utils/safe-html';

export interface ConfirmConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  icon?: string;
  detail?: string; // extra small text
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cd-overlay" *ngIf="visible" (click)="onOverlay($event)">
      <div class="cd-box" role="alertdialog">
        <div class="cd-icon" *ngIf="config?.icon">{{ config!.icon }}</div>
        <h3 class="cd-title">{{ config?.title }}</h3>
        <p class="cd-message" [innerHTML]="safeMessage"></p>
        <p class="cd-detail" *ngIf="config?.detail">{{ config!.detail }}</p>
        <div class="cd-actions">
          <button class="cd-btn cd-cancel" (click)="cancelled.emit()">
            {{ config?.cancelText || 'Cancel' }}
          </button>
          <button
            class="cd-btn"
            [ngClass]="'cd-' + (config?.type || 'danger')"
            (click)="confirmed.emit()"
          >
            {{ config?.confirmText || 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .cd-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: cdf 0.15s ease;
      }
      .cd-box {
        background: var(--surface, #1a1a1a);
        border: 1px solid var(--border, #333);
        padding: 2rem 2.25rem;
        max-width: 400px;
        width: 92%;
        clip-path: polygon(
          0 0,
          calc(100% - 10px) 0,
          100% 10px,
          100% 100%,
          10px 100%,
          0 calc(100% - 10px)
        );
        animation: cdu 0.2s ease;
      }
      .cd-icon {
        font-size: 2.25rem;
        margin-bottom: 0.75rem;
        display: block;
      }
      .cd-title {
        font-size: 1.1rem;
        font-weight: 800;
        margin-bottom: 0.5rem;
        color: var(--text, #f0ede8);
      }
      .cd-message {
        color: var(--muted, #888);
        font-size: 0.9rem;
        line-height: 1.6;
        margin-bottom: 0.5rem;
      }
      .cd-detail {
        color: var(--muted, #888);
        font-size: 0.78rem;
        margin-bottom: 1.5rem;
        opacity: 0.7;
      }
      .cd-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        margin-top: 1.5rem;
      }
      .cd-btn {
        font-family: 'Space Mono', monospace;
        font-size: 0.65rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 0.6rem 1.3rem;
        cursor: pointer;
        font-weight: 700;
        background: transparent;
        border: 1px solid var(--border, #333);
        color: var(--text, #f0ede8);
        transition: all 0.15s;
      }
      .cd-cancel {
        color: var(--muted, #888);
        &:hover {
          color: var(--text, #f0ede8);
          border-color: var(--text, #f0ede8);
        }
      }
      .cd-danger {
        color: #ff4d6d;
        border-color: rgba(255, 77, 109, 0.35);
        &:hover {
          background: rgba(255, 77, 109, 0.12);
          border-color: #ff4d6d;
        }
      }
      .cd-warning {
        color: #f5a623;
        border-color: rgba(245, 166, 35, 0.35);
        &:hover {
          background: rgba(245, 166, 35, 0.1);
          border-color: #f5a623;
        }
      }
      .cd-info {
        color: #00e5ff;
        border-color: rgba(0, 229, 255, 0.3);
        &:hover {
          background: rgba(0, 229, 255, 0.08);
          border-color: #00e5ff;
        }
      }
      @keyframes cdf {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes cdu {
        from {
          opacity: 0;
          transform: translateY(14px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() config: ConfirmConfig | null = null;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  get safeMessage(): string {
    return sanitizeHtml(this.config?.message ?? '');
  }

  onOverlay(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('cd-overlay')) this.cancelled.emit();
  }
}
