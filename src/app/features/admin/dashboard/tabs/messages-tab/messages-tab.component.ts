import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Message } from '@core/models';
import { ConfirmService } from '@core/services/confirm.service';
import { MessagesStateService } from '@core/services/messages-state.service';
import { MessagesService } from '@core/services/messages.service';
import { ToastService } from '@shared/components/toast/toast.component';

@Component({
  selector: 'app-messages-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './messages-tab.component.html',
  styleUrl: './messages-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagesTabComponent {
  private readonly messagesService = inject(MessagesService);
  readonly messagesState = inject(MessagesStateService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  selectedMessage: Message | null = null;
  messageFilter: 'all' | 'unread' | 'starred' = 'all';

  ngOnInit(): void {
    this.loadMessages();
  }

  get messages(): Message[] {
    return this.messagesState.state().messages;
  }

  get unreadCount(): number {
    return this.messagesState.state().unreadCount;
  }

  get messagesLoading(): boolean {
    return this.messagesState.state().loading;
  }

  loadMessages(): void {
    const hadMessages = this.messages.length > 0;
    this.messagesState.load();
    if (!hadMessages) {
      return;
    }
    // Preserve selected message object identity after refresh by matching ids.
    queueMicrotask(() => {
      if (!this.selectedMessage) return;
      const next = this.messages.find((m) => m.id === this.selectedMessage?.id) || null;
      this.selectedMessage = next;
    });
  }

  get filteredMessages(): Message[] {
    if (this.messageFilter === 'unread') return this.messages.filter((m) => !m.read);
    if (this.messageFilter === 'starred') return this.messages.filter((m) => m.starred);
    return this.messages;
  }

  openMessage(msg: Message): void {
    this.selectedMessage = msg;
    if (!msg.read) {
      this.messagesService.markRead(msg.id).subscribe(() => {
        msg.read = true;
        this.messagesState.patch({ unreadCount: Math.max(0, this.unreadCount - 1) });
      });
    }
  }

  closeMessage(): void {
    this.selectedMessage = null;
  }

  toggleStar(msg: Message, e: Event): void {
    e.stopPropagation();
    this.messagesService.toggleStar(msg.id).subscribe(() => {
      msg.starred = !msg.starred;
      this.messagesState.patch({ messages: [...this.messages] });
    });
  }

  async deleteMessage(id: string, e?: Event): Promise<void> {
    if (e) e.stopPropagation();
    const ok = await this.confirm.ask({
      title: 'Delete Message',
      message: 'This message will be permanently deleted.',
      confirmText: 'Delete',
      type: 'danger',
      icon: '🗑️',
    });
    if (!ok) return;
    this.messagesService.deleteMessage(id).subscribe({
      next: () => {
        const nextMessages = this.messages.filter((m) => m.id !== id);
        const nextUnread = nextMessages.filter((m) => !m.read).length;
        this.messagesState.patch({ messages: nextMessages, unreadCount: nextUnread });
        if (this.selectedMessage?.id === id) this.selectedMessage = null;
        this.toast.success('Message deleted');
      },
      error: () => this.toast.error('Delete failed'),
    });
  }

  markAllRead(): void {
    this.messagesService.markAllRead().subscribe({
      next: () => {
        const nextMessages = this.messages.map((m) => ({ ...m, read: true }));
        this.messagesState.patch({ messages: nextMessages, unreadCount: 0 });
        this.toast.success('All marked read');
      },
    });
  }

  getUnreadCount(): number {
    return this.messages.filter((m) => !m.read).length;
  }

  getStarredCount(): number {
    return this.messages.filter((m) => m.starred).length;
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
