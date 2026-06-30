import { Marked, Renderer } from 'marked';
import { sanitizeHtml } from './safe-html';

/**
 * A shared `marked` instance configured for the blog:
 *  - GitHub-Flavored Markdown
 *  - every external link gets `rel="noopener nofollow"` and
 *    `target="_blank"`
 *  - output runs through DOMPurify before being returned
 */
const marked = new Marked({
  gfm: true,
  breaks: false,
  pedantic: false,
});

const renderer: Partial<Renderer> = {
  link(token) {
    const { href, title, text } = token;
    const t = title ? ` title="${escapeAttr(title)}"` : '';
    const external = /^https?:\/\//.test(href);
    const rel = external ? ' rel="noopener nofollow" target="_blank"' : '';
    return `<a href="${escapeAttr(href)}"${t}${rel}>${text}</a>`;
  },
};

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Renders a markdown string to a sanitised HTML string. */
export function renderMarkdown(md: string): string {
  if (!md) return '';
  const raw = marked.use({ renderer }).parse(md, { async: false }) as string;
  return sanitizeHtml(raw);
}
