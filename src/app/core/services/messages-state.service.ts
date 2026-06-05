import { Injectable, inject, signal } from '@angular/core';
import { Message } from '@core/models';
import { MessagesService } from './messages.service';

export interface MessagesState {
  messages: Message[];
  unreadCount: number;
  loading: boolean;
}

@Injectable({ providedIn: 'root' })
export class MessagesStateService {
  private readonly messagesService = inject(MessagesService);

  readonly state = signal<MessagesState>({
    messages: [],
    unreadCount: 0,
    loading: false,
  });

  load(): void {
    this.state.update((s) => ({ ...s, loading: true }));
    this.messagesService.getMessages().subscribe({
      next: (res) => {
        this.state.set({
          messages: res.messages,
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
}
