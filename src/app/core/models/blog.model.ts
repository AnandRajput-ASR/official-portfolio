import { EntityMetadata } from './api.model';

export interface BlogPost extends EntityMetadata {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  coverImage: string;
  published: boolean;
  publishedAt: string;
  unpublishedAt?: string;
  readingTime: number;
  displayOrder: number;
}

export interface BlogSocialComment {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}

export type BlogCommentModerationStatus = 'visible' | 'hidden' | 'deleted';

export interface AdminBlogComment {
  id: string;
  slug: string;
  authorName: string;
  content: string;
  createdAt: string;
  moderationStatus: BlogCommentModerationStatus;
  moderationReason?: string | null;
  moderatedBy?: string | null;
  moderatedAt?: string | null;
  hiddenAt?: string | null;
  deletedAt?: string | null;
}

export interface AdminBlogCommentsPayload {
  comments: AdminBlogComment[];
  counts: Record<BlogCommentModerationStatus | 'all', number>;
}

export interface BlogSocialState {
  slug: string;
  likes: number;
  shares: number;
  viewerLiked: boolean;
  comments: BlogSocialComment[];
}

export interface BlogCommentInput {
  name?: string;
  message: string;
}
