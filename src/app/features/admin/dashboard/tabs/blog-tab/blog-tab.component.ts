import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminBlogComment,
  AdminBlogCommentsPayload,
  BlogCommentModerationStatus,
  BlogPost,
} from '@core/models';
import { AdminContentStore } from '@core/services/admin-content.store';
import { AdminService } from '@core/services/admin.service';
import { ConfirmService } from '@core/services/confirm.service';
import { renderMarkdown } from '@core/utils/markdown';
import { ToastService } from '@shared/components/toast/toast.component';

@Component({
  selector: 'app-blog-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blog-tab.component.html',
  styleUrls: ['./blog-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogTabComponent implements OnInit, OnDestroy {
  private readonly FEATURED_TAG = 'featured';
  private store = inject(AdminContentStore);
  private adminService = inject(AdminService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  blogEdit: BlogPost[] = [];
  showAddBlog = false;
  editingBlogId: string | null = null;
  newBlog: Partial<BlogPost> = this.emptyBlog();
  previewBlogIds = new Set<string>();
  commentsPanelOpenBySlug = new Set<string>();
  commentsLoadingBySlug: Record<string, boolean> = {};
  commentsBySlug: Record<string, AdminBlogComment[]> = {};
  commentsCountsBySlug: Record<string, AdminBlogCommentsPayload['counts']> = {};
  commentsStatusFilterBySlug: Record<string, BlogCommentModerationStatus | 'all'> = {};
  moderatingCommentKeys = new Set<string>();

  get saving(): boolean {
    return this.store.saving();
  }

  ngOnInit(): void {
    this.blogEdit = JSON.parse(JSON.stringify(this.store.content()?.blogPosts ?? [])).map(
      (post: BlogPost) => this.normalizePostSchedule(post),
    );
    this.store.registerSaver('blog', () => this.saveBlog());
  }

  ngOnDestroy(): void {
    this.store.unregisterSaver('blog');
  }

  markDirty(): void {
    this.store.markDirty('blog');
  }

  togglePreview(id: string): void {
    if (this.previewBlogIds.has(id)) {
      this.previewBlogIds.delete(id);
    } else {
      this.previewBlogIds.add(id);
    }
  }

  insertCodeBlock(target: Partial<BlogPost>, editor: HTMLTextAreaElement): void {
    const snippet = '\n```ts\n// write your code\n```\n';
    const cursorOffset = '\n```ts\n'.length;
    this.insertAtCursor(target, editor, snippet, cursorOffset);
  }

  insertInlineCode(target: Partial<BlogPost>, editor: HTMLTextAreaElement): void {
    this.insertAtCursor(target, editor, '`code`', 1);
  }

  insertImageMarkdown(target: Partial<BlogPost>, editor: HTMLTextAreaElement): void {
    const snippet = '\n![alt text](https://example.com/image.png)\n';
    const cursorOffset = '\n![alt text]('.length;
    this.insertAtCursor(target, editor, snippet, cursorOffset);
  }

  onImageFilePicked(
    target: Partial<BlogPost>,
    event: Event,
    editor: HTMLTextAreaElement,
  ): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toast.error('Please choose an image file.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) {
        this.toast.error('Could not read image file.');
        return;
      }
      const altText = file.name.replace(/\.[^.]+$/, '') || 'screenshot';
      const snippet = `\n![${altText}](${dataUrl})\n`;
      this.insertAtCursor(target, editor, snippet);
      this.toast.success('Image embedded in markdown.');
      input.value = '';
    };
    reader.onerror = () => {
      this.toast.error('Failed to read image file.');
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  onEditorPasteImage(
    target: Partial<BlogPost>,
    event: ClipboardEvent,
    editor: HTMLTextAreaElement,
  ): void {
    const clipboardData = event.clipboardData;
    const items = Array.from(clipboardData?.items ?? []);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    const fileFromItem = imageItem?.getAsFile() ?? null;
    const fileFromFiles = Array.from(clipboardData?.files ?? []).find((file) =>
      file.type.startsWith('image/'),
    );
    const file = fileFromItem ?? fileFromFiles ?? null;
    if (!file) {
      return;
    }

    event.preventDefault();
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) {
        this.toast.error('Could not read pasted image.');
        return;
      }
      const snippet = `\n![pasted-screenshot](${dataUrl})\n`;
      this.insertAtCursor(target, editor, snippet);
      this.toast.success('Pasted screenshot embedded in markdown.');
    };
    reader.onerror = () => {
      this.toast.error('Failed to read pasted image.');
    };
    reader.readAsDataURL(file);
  }

  getPreviewHtml(content: string): string {
    // Normalize literal \n escape sequences (from JSON-encoded data) to real newlines
    const normalized = (content || '').replace(/\\n/g, '\n');
    return renderMarkdown(normalized);
  }

  saveBlog(): void {
    this.blogEdit = this.blogEdit.map((post) => this.normalizePostSchedule(post));
    this.store.saving.set(true);
    this.adminService.updateBlogPosts(this.blogEdit).subscribe({
      next: () => {
        const current = this.store.content();
        if (current) {
          current.blogPosts = JSON.parse(JSON.stringify(this.blogEdit));
          this.store.content.set({ ...current });
        }
        this.store.saving.set(false);
        this.store.clearDirty('blog');
        this.editingBlogId = null;
        this.toast.success('Blog saved!');
        this.cdr.markForCheck();
      },
      error: () => {
        this.store.saving.set(false);
        this.toast.error('Save failed');
        this.cdr.markForCheck();
      },
    });
  }

  submitAddBlog(): void {
    const normalizedPublishedAt = this.normalizeDateTimeInput(this.newBlog.publishedAt, false);
    const normalizedUnpublishAt = this.normalizeDateTimeInput(this.newBlog.unpublishedAt, true);
    const post: BlogPost = {
      id: 'b_' + Date.now(),
      title: this.newBlog.title || '',
      slug: (this.newBlog.title || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      excerpt: this.newBlog.excerpt || '',
      content: this.newBlog.content || '',
      tags: this.newBlog.tags || [],
      coverImage: this.newBlog.coverImage || '',
      published: this.newBlog.published || false,
      publishedAt: normalizedPublishedAt,
      unpublishedAt: normalizedUnpublishAt,
      readingTime: this.newBlog.readingTime || 5,
      displayOrder: this.blogEdit.length,
    };
    this.adminService.addBlogPost(post).subscribe({
      next: (res) => {
        this.blogEdit.push(res.data || post);
        const current = this.store.content();
        if (current) {
          current.blogPosts = JSON.parse(JSON.stringify(this.blogEdit));
          this.store.content.set({ ...current });
        }
        this.showAddBlog = false;
        this.newBlog = this.emptyBlog();
        this.toast.success('Post added!');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Add failed'),
    });
  }

  async deleteBlogPost(id: string): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete Blog Post',
      message: 'This article will be permanently deleted and no longer accessible.',
      confirmText: 'Delete Post',
      type: 'danger',
      icon: '✍️',
    });
    if (!ok) return;
    this.blogEdit = this.blogEdit.filter((p) => p.id !== id);
    this.cdr.markForCheck();
    this.adminService.deleteBlogPost(id).subscribe({
      next: () => {
        const current = this.store.content();
        if (current) {
          current.blogPosts = JSON.parse(JSON.stringify(this.blogEdit));
          this.store.content.set({ ...current });
        }
        this.toast.success('Post deleted');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Delete failed'),
    });
  }

  saveSingleBlog(post: BlogPost): void {
    // Keep slug in sync when empty.
    if (!post.slug) {
      post.slug = post.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    const payload = this.normalizePostSchedule(post);
    this.assignPost(post, payload);
    this.store.saving.set(true);
    this.adminService.updateBlogPost(post.id, payload).subscribe({
      next: () => {
        this.store.saving.set(false);
        this.editingBlogId = null;
        this.toast.success(`"${post.title}" saved!`);
        this.cdr.markForCheck();
      },
      error: () => {
        this.store.saving.set(false);
        this.toast.error('Save failed');
        this.cdr.markForCheck();
      },
    });
  }

  toggleEditBlog(id: string): void {
    this.editingBlogId = this.editingBlogId === id ? null : id;
  }

  viewBlog(slug: string): void {
    window.open('/blog/' + slug, '_blank');
  }

  formatScheduleChip(post: BlogPost): string {
    const publishAt = this.normalizeDateTimeInput(post.publishedAt, false);
    const unpublishAt = this.normalizeDateTimeInput(post.unpublishedAt, true);

    if (!publishAt) return 'Not scheduled';
    const fmt = (dt: string) => {
      const d = new Date(dt);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        + ' · '
        + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };
    if (unpublishAt) return `${fmt(publishAt)} → ${fmt(unpublishAt)}`;
    return fmt(publishAt);
  }

  addBlogTag(p: Partial<BlogPost>, e: Event): void {
    if (!p.tags) p.tags = [];
    const v = (e.target as HTMLInputElement).value.trim();
    if (v && !p.tags.includes(v)) {
      p.tags.push(v);
      (e.target as HTMLInputElement).value = '';
      this.markDirty();
    }
  }

  removeBlogTag(p: Partial<BlogPost>, t: string): void {
    p.tags = (p.tags || []).filter((x) => x !== t);
    this.markDirty();
  }

  addTagToNew(list: string[], e: Event): void {
    const v = (e.target as HTMLInputElement).value.trim();
    if (v && !list.includes(v)) {
      list.push(v);
      (e.target as HTMLInputElement).value = '';
    }
  }

  removeTagFromNew(list: string[], tag: string): void {
    const i = list.indexOf(tag);
    if (i > -1) list.splice(i, 1);
  }

  isFeaturedPost(post: Partial<BlogPost>): boolean {
    return (post.tags || []).some((tag) => tag.toLowerCase() === this.FEATURED_TAG);
  }

  setFeaturedPost(post: Partial<BlogPost>, featured: boolean): void {
    const tags = [...(post.tags || [])].filter((tag) => tag.toLowerCase() !== this.FEATURED_TAG);
    if (featured) {
      tags.push(this.FEATURED_TAG);
    }
    post.tags = tags;
    this.markDirty();
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  trackByCommentId(_: number, item: { id: string }): string {
    return item.id;
  }

  isCommentsPanelOpen(slug: string): boolean {
    return this.commentsPanelOpenBySlug.has(slug);
  }

  commentsFor(slug: string): AdminBlogComment[] {
    return this.commentsBySlug[slug] ?? [];
  }

  commentsCountsFor(slug: string): AdminBlogCommentsPayload['counts'] {
    return this.commentsCountsBySlug[slug] ?? { all: 0, visible: 0, hidden: 0, deleted: 0 };
  }

  selectedCommentsStatus(slug: string): BlogCommentModerationStatus | 'all' {
    return this.commentsStatusFilterBySlug[slug] ?? 'all';
  }

  commentsLoading(slug: string): boolean {
    return this.commentsLoadingBySlug[slug] === true;
  }

  setCommentsFilter(post: BlogPost, status: BlogCommentModerationStatus | 'all'): void {
    const slug = post.slug?.trim();
    if (!slug || this.selectedCommentsStatus(slug) === status) {
      return;
    }
    this.commentsStatusFilterBySlug[slug] = status;
    this.loadComments(slug);
  }

  toggleCommentsPanel(post: BlogPost): void {
    const slug = post.slug?.trim();
    if (!slug) {
      this.toast.error('Save the post slug first to manage comments.');
      return;
    }

    if (this.commentsPanelOpenBySlug.has(slug)) {
      this.commentsPanelOpenBySlug.delete(slug);
      this.cdr.markForCheck();
      return;
    }

    this.commentsPanelOpenBySlug.add(slug);
    if (!this.commentsBySlug[slug]) {
      this.loadComments(slug);
    }
    this.cdr.markForCheck();
  }

  async moderateComment(
    post: BlogPost,
    comment: AdminBlogComment,
    action: 'hide' | 'unhide' | 'delete' | 'restore',
  ): Promise<void> {
    const slug = post.slug?.trim();
    if (!slug) {
      this.toast.error('Missing post slug for comment moderation.');
      return;
    }

    const actionText = this.moderationActionLabel(action);
    const ok = await this.confirm.ask({
      title: `${actionText} Comment`,
      message: this.moderationActionMessage(action),
      confirmText: `${actionText}`,
      type: action === 'delete' ? 'danger' : 'warning',
      icon: action === 'restore' ? '♻️' : '🛡️',
    });
    if (!ok) return;

    const key = this.commentKey(slug, comment.id);
    this.moderatingCommentKeys.add(key);
    this.cdr.markForCheck();

    this.adminService.moderateBlogComment(slug, comment.id, action).subscribe({
      next: () => {
        this.moderatingCommentKeys.delete(key);
        this.toast.success(`Comment ${this.moderationActionPastTense(action)}.`);
        this.loadComments(slug);
        this.cdr.markForCheck();
      },
      error: () => {
        this.moderatingCommentKeys.delete(key);
        this.toast.error(`Failed to ${actionText.toLowerCase()} comment.`);
        this.cdr.markForCheck();
      },
    });
  }

  isModeratingComment(slug: string, commentId: string): boolean {
    return this.moderatingCommentKeys.has(this.commentKey(slug, commentId));
  }

  moderationStatusLabel(status: BlogCommentModerationStatus): string {
    switch (status) {
      case 'hidden':
        return 'Hidden';
      case 'deleted':
        return 'Deleted';
      default:
        return 'Visible';
    }
  }

  private emptyBlog(): Partial<BlogPost> {
    const nowLocal = this.toDateTimeLocalInput(new Date().toISOString());
    return {
      title: '',
      excerpt: '',
      content: '',
      tags: [],
      coverImage: '',
      published: false,
      publishedAt: nowLocal,
      unpublishedAt: '',
      readingTime: 5,
    };
  }

  private normalizePostSchedule(post: BlogPost): BlogPost {
    const normalizedPublishedAt = this.normalizeDateTimeInput(post.publishedAt, false);
    const normalizedUnpublishAt = this.normalizeDateTimeInput(post.unpublishedAt, true);

    return {
      ...post,
      publishedAt: normalizedPublishedAt,
      unpublishedAt:
        normalizedUnpublishAt && normalizedUnpublishAt > normalizedPublishedAt
          ? normalizedUnpublishAt
          : '',
    };
  }

  private normalizeDateTimeInput(value: string | undefined, allowEmpty: boolean): string {
    if (!value) return allowEmpty ? '' : this.toDateTimeLocalInput(new Date().toISOString());
    const hasTime = value.includes('T');
    if (hasTime) return value.slice(0, 16);
    return `${value}T09:00`;
  }

  private toDateTimeLocalInput(iso: string): string {
    const parsed = Date.parse(iso);
    const d = Number.isFinite(parsed) ? new Date(parsed) : new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private assignPost(target: BlogPost, source: BlogPost): void {
    target.publishedAt = source.publishedAt;
    target.unpublishedAt = source.unpublishedAt;
  }

  private loadComments(slug: string): void {
    this.commentsLoadingBySlug[slug] = true;
    const selectedStatus = this.selectedCommentsStatus(slug);
    this.cdr.markForCheck();

    this.adminService.getBlogComments(slug, selectedStatus).subscribe({
      next: (payload) => {
        this.commentsBySlug[slug] = [...(payload.comments ?? [])].sort(
          (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
        );
        this.commentsCountsBySlug[slug] = payload.counts;
        this.commentsLoadingBySlug[slug] = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.commentsBySlug[slug] = [];
        this.commentsCountsBySlug[slug] = { all: 0, visible: 0, hidden: 0, deleted: 0 };
        this.commentsLoadingBySlug[slug] = false;
        this.toast.error('Could not load comments for this post.');
        this.cdr.markForCheck();
      },
    });
  }

  private moderationActionLabel(action: 'hide' | 'unhide' | 'delete' | 'restore'): string {
    switch (action) {
      case 'hide':
        return 'Hide';
      case 'unhide':
        return 'Unhide';
      case 'delete':
        return 'Delete';
      default:
        return 'Restore';
    }
  }

  private moderationActionPastTense(action: 'hide' | 'unhide' | 'delete' | 'restore'): string {
    switch (action) {
      case 'hide':
        return 'hidden';
      case 'unhide':
        return 'unhidden';
      case 'delete':
        return 'soft-deleted';
      default:
        return 'restored';
    }
  }

  private moderationActionMessage(action: 'hide' | 'unhide' | 'delete' | 'restore'): string {
    switch (action) {
      case 'hide':
        return 'This comment will be hidden from public view, and you can unhide it later.';
      case 'unhide':
        return 'This comment will be visible again on the public blog post.';
      case 'delete':
        return 'This comment will be soft-deleted and removed from public view. You can restore it later.';
      default:
        return 'This soft-deleted comment will be restored to public visibility.';
    }
  }

  private commentKey(slug: string, commentId: string): string {
    return `${slug}::${commentId}`;
  }

  private insertAtCursor(
    target: Partial<BlogPost>,
    editor: HTMLTextAreaElement,
    snippet: string,
    cursorOffset = snippet.length,
  ): void {
    const current = target.content || '';
    const start = Number.isFinite(editor.selectionStart) ? editor.selectionStart : current.length;
    const end = Number.isFinite(editor.selectionEnd) ? editor.selectionEnd : current.length;
    const next = `${current.slice(0, start)}${snippet}${current.slice(end)}`;
    target.content = next;
    this.markDirty();
    this.cdr.markForCheck();

    queueMicrotask(() => {
      const cursor = start + Math.max(0, cursorOffset);
      editor.focus();
      editor.setSelectionRange(cursor, cursor);
    });
  }
}
