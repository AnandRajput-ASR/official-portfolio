import { BlogPost } from '@core/models';
import { asDict, list, notDeleted, unwrapData } from './normalizer-helpers';

export function normalizeBlogPostsCollection(rawValue: unknown): BlogPost[] {
  const payload = asDict(unwrapData(rawValue));

  return list<BlogPost>(
    payload['blogPosts'] ?? payload['blog_posts'] ?? payload['posts'] ?? payload['items'] ?? rawValue,
  ).filter(notDeleted);
}
