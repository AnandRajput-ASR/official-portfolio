import { BlogPost } from '@core/models';

type Dict = Record<string, unknown>;

function isDict(value: unknown): value is Dict {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asDict(value: unknown): Dict {
  return isDict(value) ? value : {};
}

function unwrapData(value: unknown): unknown {
  const record = asDict(value);
  return record['data'] ?? value;
}

function list<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value == null) return [];
  return [value as T];
}

function notDeleted<T>(item: T): boolean {
  return asDict(item)['is_deleted'] !== true;
}

export function normalizeBlogPostsCollection(rawValue: unknown): BlogPost[] {
  const payload = asDict(unwrapData(rawValue));

  return list<BlogPost>(
    payload['blogPosts'] ?? payload['blog_posts'] ?? payload['posts'] ?? payload['items'] ?? rawValue,
  ).filter(notDeleted);
}
