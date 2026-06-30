import { sanitizeHtml } from './safe-html';

describe('sanitizeHtml', () => {
  it('returns empty for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('strips <script> tags', () => {
    expect(sanitizeHtml('<script>alert(1)</script>')).not.toContain('<script>');
  });

  it('strips on* event handlers', () => {
    const html = sanitizeHtml('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain('onerror');
  });

  it('strips javascript: URLs', () => {
    const html = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(html).not.toContain('javascript:');
  });

  it('strips data: URLs', () => {
    const html = sanitizeHtml('<a href="data:text/html;base64,foo">x</a>');
    expect(html).not.toContain('data:text/html');
  });

  it('keeps data:image URLs on img tags', () => {
    const html = sanitizeHtml('<img src="data:image/png;base64,AAAA" alt="img">');
    expect(html).toContain('data:image/png;base64,AAAA');
  });

  it('strips non-image data: URLs on img tags', () => {
    const html = sanitizeHtml('<img src="data:text/html;base64,AAAA" alt="img">');
    expect(html).not.toContain('data:text/html');
  });

  it('keeps allowed YouTube iframe', () => {
    const html = sanitizeHtml(
      '<iframe src="https://www.youtube.com/embed/abc" frameborder="0"></iframe>',
    );
    expect(html).toContain('iframe');
    expect(html).toContain('youtube.com');
  });

  it('strips disallowed iframe src', () => {
    const html = sanitizeHtml('<iframe src="https://evil.example/x"></iframe>');
    expect(html).not.toContain('evil.example');
  });

  it('keeps allowed tags (h1, p, strong, em, code, pre)', () => {
    const html = sanitizeHtml(
      '<h1>title</h1><p>body with <strong>bold</strong> and <em>italic</em> and <code>x</code></p>',
    );
    expect(html).toContain('<h1>title</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<code>x</code>');
  });

  it('strips style and link tags entirely', () => {
    const html = sanitizeHtml('<style>body{color:red}</style><link rel="x" href="y">');
    expect(html).not.toContain('<style>');
    expect(html).not.toContain('<link');
  });
});
