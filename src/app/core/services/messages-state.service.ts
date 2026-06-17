import { Injectable, inject, signal } from '@angular/core';
import { Message } from '@core/models';
import { MessagesService } from './messages.service';
import { StorageService } from './storage.service';

interface MessageMeta {
  labels: string[];
  archived: boolean;
  repliedAt: string | null;
}

export interface MessagesState {
  messages: Message[];
  unreadCount: number;
  loading: boolean;
}

@Injectable({ providedIn: 'root' })
export class MessagesStateService {
  private static readonly META_KEY = 'messagesMeta';

  private readonly messagesService = inject(MessagesService);
  private readonly storage = inject(StorageService);
  private metaById: Record<string, MessageMeta> = this.storage.get(MessagesStateService.META_KEY) || {};

  readonly state = signal<MessagesState>({
    messages: [],
    unreadCount: 0,
    loading: false,
  });

  load(): void {
    this.state.update((s) => ({ ...s, loading: true }));
    this.messagesService.getMessages().subscribe({
      next: (res) => {
        const hydrated = res.messages.map((m) => this.applyMeta(m));
        this.state.set({
          messages: hydrated,
          unreadCount: res.unreadCount,
          loading: false,
        });
      },
      error: () => {
        this.state.update((s) => ({ ...s, loading: false }));
      },
    });
  }

  patch(partial: Partial<MessagesState>): void {
    this.state.update((s) => ({ ...s, ...partial }));
  }

  setArchived(id: string, archived: boolean): void {
    const nextMessages = this.state().messages.map((m) =>
      m.id === id ? { ...m, archived } : m,
    );
    this.patch({ messages: nextMessages });
    this.updateMeta(id, { archived });
  }

  setLabels(id: string, labels: string[]): void {
    const normalized = Array.from(
      new Set(labels.map((l) => l.trim()).filter((l) => l.length > 0)),
    );
    const nextMessages = this.state().messages.map((m) =>
      m.id === id ? { ...m, labels: normalized } : m,
    );
    this.patch({ messages: nextMessages });
    this.updateMeta(id, { labels: normalized });
  }

  markQuickReplied(id: string): void {
    const repliedAt = new Date().toISOString();
    const nextMessages = this.state().messages.map((m) =>
      m.id === id ? { ...m, repliedAt } : m,
    );
    this.patch({ messages: nextMessages });
    this.updateMeta(id, { repliedAt });
  }

  private applyMeta(message: Message): Message {
    const meta = this.metaById[message.id];
    if (!meta) {
      return {
        ...message,
        labels: message.labels || [],
        archived: message.archived ?? false,
        repliedAt: message.repliedAt ?? null,
      };
    }
    return {
      ...message,
      labels: meta.labels,
      archived: meta.archived,
      repliedAt: meta.repliedAt,
    };
  }

  private updateMeta(id: string, patch: Partial<MessageMeta>): void {
    const current =
      this.metaById[id] ||
      ({
        labels: [],
        archived: false,
        repliedAt: null,
      } as MessageMeta);
    this.metaById[id] = { ...current, ...patch };
    this.storage.set(MessagesStateService.META_KEY, this.metaById);
  }
}
