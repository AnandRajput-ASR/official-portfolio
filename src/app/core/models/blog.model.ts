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
