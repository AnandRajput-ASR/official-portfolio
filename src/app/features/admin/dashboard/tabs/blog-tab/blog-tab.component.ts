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
import { BlogPost } from '@core/models';
import { AdminContentStore } from '@core/services/admin-content.store';
import { AdminService } from '@core/services/admin.service';
import { ContentService } from '@core/services/content.service';
import { ConfirmService } from '@core/services/confirm.service';
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
  private store = inject(AdminContentStore);
  private adminService = inject(AdminService);
  private contentService = inject(ContentService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  blogEdit: BlogPost[] = [];
  showAddBlog = false;
  editingBlogId: string | null = null;
  newBlog: Partial<BlogPost> = this.emptyBlog();

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
    if (unpublishAt) return `${publishAt} -> ${unpublishAt}`;
    return publishAt;
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

  trackById(_: number, item: { id: string }): string {
    return item.id;
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
}
