import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Message } from '@core/models';
import { ConfirmService } from '@core/services/confirm.service';
import { MessagesStateService } from '@core/services/messages-state.service';
import { MessagesService } from '@core/services/messages.service';
import { ToastService } from '@shared/components/toast/toast.component';

@Component({
  selector: 'app-messages-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  messageFilter: 'all' | 'unread' | 'starred' | 'archived' = 'all';
  activeLabel = 'all';
  labelInput = '';

  readonly quickReplies: Array<{ title: string; subject: string; body: string }> = [
    {
      title: 'Intro Call',
      subject: 'Thanks for reaching out',
      body: 'Hi {{name}},\n\nThanks for your message. Happy to connect for a quick intro call this week.\n\nBest,\nAnand',
    },
    {
      title: 'Project Scope',
      subject: 'Could you share a few project details?',
      body: 'Hi {{name}},\n\nThanks for contacting me. Please share scope, timeline, and expected budget so I can suggest next steps.\n\nRegards,\nAnand',
    },
    {
      title: 'CV Shared',
      subject: 'Resume and profile details',
      body: 'Hi {{name}},\n\nThanks for your interest. I have shared my latest profile details and would be glad to discuss the role.\n\nBest regards,\nAnand',
    },
  ];

  readonly suggestedLabels: string[] = ['Recruiter', 'Client', 'Follow-up', 'Hot Lead', 'Spam'];

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
    const withFilter = this.messages.filter((m) => {
      const isArchived = !!m.archived;
      if (this.messageFilter === 'archived') return isArchived;
      if (isArchived) return false;
      if (this.messageFilter === 'unread') return !m.read;
      if (this.messageFilter === 'starred') return m.starred;
      return true;
    });

    if (this.activeLabel === 'all') return withFilter;
    return withFilter.filter((m) => (m.labels || []).includes(this.activeLabel));
  }

  get availableLabels(): string[] {
    const fromMessages = this.messages.flatMap((m) => m.labels || []);
    return Array.from(new Set([...this.suggestedLabels, ...fromMessages])).sort((a, b) =>
      a.localeCompare(b),
    );
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
    this.labelInput = '';
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

  getArchivedCount(): number {
    return this.messages.filter((m) => !!m.archived).length;
  }

  setActiveLabel(label: string): void {
    this.activeLabel = label;
  }

  toggleArchived(msg: Message, e?: Event): void {
    if (e) e.stopPropagation();
    const next = !msg.archived;
    msg.archived = next;
    this.messagesState.setArchived(msg.id, next);
    if (next && this.selectedMessage?.id === msg.id) {
      this.closeMessage();
    }
    this.toast.success(next ? 'Message archived' : 'Message moved to inbox');
  }

  addLabel(msg: Message): void {
    const value = this.labelInput.trim();
    if (!value) return;
    const labels = Array.from(new Set([...(msg.labels || []), value]));
    msg.labels = labels;
    this.messagesState.setLabels(msg.id, labels);
    this.labelInput = '';
  }

  quickAddLabel(msg: Message, label: string, e?: Event): void {
    if (e) e.stopPropagation();
    const labels = msg.labels || [];
    if (labels.includes(label)) return;
    const next = [...labels, label];
    msg.labels = next;
    this.messagesState.setLabels(msg.id, next);
  }

  removeLabel(msg: Message, label: string, e?: Event): void {
    if (e) e.stopPropagation();
    const next = (msg.labels || []).filter((l) => l !== label);
    msg.labels = next;
    this.messagesState.setLabels(msg.id, next);
  }

  getQuickReplyHref(msg: Message, template: { subject: string; body: string }): string {
    const subject = encodeURIComponent(template.subject);
    const body = encodeURIComponent(template.body.replaceAll('{{name}}', msg.name));
    return `mailto:${msg.email}?subject=${subject}&body=${body}`;
  }

  markQuickReplySent(msg: Message): void {
    msg.repliedAt = new Date().toISOString();
    this.messagesState.markQuickReplied(msg.id);
    this.toast.success('Quick reply opened in your email client');
  }

  exportCsv(filteredOnly = true): void {
    const rows = filteredOnly ? this.filteredMessages : this.messages;
    if (!rows.length) {
      this.toast.error('No messages available to export.');
      return;
    }
    const headers = [
      'Name',
      'Email',
      'Received At',
      'Read',
      'Starred',
      'Archived',
      'Labels',
      'Replied At',
      'Message',
    ];
    const data = rows.map((m) => [
      m.name,
      m.email,
      m.receivedAt,
      m.read ? 'Yes' : 'No',
      m.starred ? 'Yes' : 'No',
      m.archived ? 'Yes' : 'No',
      (m.labels || []).join('|'),
      m.repliedAt || '',
      m.message,
    ]);
    const csv = [headers, ...data].map((line) => line.map((v) => this.csvEscape(v)).join(',')).join('\n');
    if (typeof document === 'undefined') return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `messages-${filteredOnly ? 'filtered' : 'all'}-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.toast.success('CSV export started');
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

  private csvEscape(value: string): string {
    const normalized = (value || '').replace(/\r?\n|\r/g, ' ');
    const escaped = normalized.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
