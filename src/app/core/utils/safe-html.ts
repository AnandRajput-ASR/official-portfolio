import DOMPurify from 'dompurify';

/**
 * Tight allowlist for sanitising HTML that ends up in
 * `[innerHTML]` bindings. The blog markdown renderer is the main
 * consumer; cert badge preview and confirm-dialog copy are the
 * secondary consumers.
 *
 * Rules:
 *  - <script> stripped
 *  - All `on*` event handlers stripped
 *  - `javascript:` and `data:` URLs stripped
 *  - <iframe> allowed only for YouTube / Vimeo embeds
 *  - <style> and <link> stripped (we never author those in content)
 */
const ALLOWED_TAGS = [
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'del', 'details', 'summary',
  'em', 'figure', 'figcaption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'i', 'img', 'ins', 'kbd', 'li', 'mark', 'ol', 'p', 'pre',
  'q', 's', 'small', 'span', 'strong', 'sub', 'sup', 'table', 'tbody',
  'td', 'th', 'thead', 'tr', 'u', 'ul',
  // Allow iframe for the YouTube / Vimeo embeds only.
  'iframe',
];

const ALLOWED_ATTR = [
  'href', 'name', 'target', 'title', 'rel',
  'class', 'id',
  'src', 'alt', 'width', 'height', 'loading',
  'colspan', 'rowspan', 'scope',
  'datetime',
  // iframe-only:
  'frameborder', 'allowfullscreen',
];

const FORBID_TAGS = ['script', 'style', 'link', 'meta', 'object', 'embed', 'base'];
const FORBID_ATTR_PREFIX = ['on'];

const IFRAME_ALLOWED_SRC = /^https:\/\/(www\.youtube\.com|player\.vimeo\.com)\//;

let configured = false;
function configure(): void {
  if (configured) return;
  configured = true;
  DOMPurify.addHook('uponSanitizeAttribute', (node, ev) => {
    const tagName = (node as Element | null)?.nodeName?.toUpperCase() ?? '';
    if (ev.attrName === 'src' || ev.attrName === 'href') {
      const v = String(ev.attrValue ?? '').trim().toLowerCase();
      if (v.startsWith('javascript:') || v.startsWith('data:')) {
        ev.keepAttr = false;
      }
    }
    if (tagName === 'IFRAME' && ev.attrName === 'src') {
      if (!IFRAME_ALLOWED_SRC.test(String(ev.attrValue ?? ''))) {
        ev.keepAttr = false;
      }
    }
  });
}
configure();

/** Returns a string of sanitised HTML. Safe to feed to [innerHTML]. */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS,
    FORBID_ATTR: FORBID_ATTR_PREFIX,
  }) as string;
}
