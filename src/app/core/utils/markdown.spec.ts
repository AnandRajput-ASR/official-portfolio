import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('returns an empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });

  it('renders headings with the right level', () => {
    const html = renderMarkdown('# H1\n\n## H2\n\n### H3');
    expect(html).toContain('<h1 id="h1">H1</h1>');
    expect(html).toContain('<h2 id="h2">H2</h2>');
    expect(html).toContain('<h3 id="h3">H3</h3>');
  });

  it('renders bold and italic', () => {
    const html = renderMarkdown('**bold** and *italic*');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('injects rel and target on external links', () => {
    const html = renderMarkdown('[example](https://example.com)');
    expect(html).toContain('rel="noopener nofollow"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('href="https://example.com"');
  });

  it('does not add nofollow to internal links', () => {
    const html = renderMarkdown('[home](/home)');
    expect(html).toContain('href="/home"');
    expect(html).not.toContain('rel="noopener nofollow"');
  });

  it('renders fenced code blocks', () => {
    const html = renderMarkdown('```\nconst x = 1;\n```');
    expect(html).toContain('<pre>');
    expect(html).toContain('const x = 1;');
  });

  it('strips raw <script> tags via sanitiser', () => {
    const html = renderMarkdown('hello\n\n<script>alert(1)</script>\n');
    expect(html).not.toContain('<script>');
    expect(html).toContain('hello');
  });

  it('strips javascript: URLs', () => {
    const html = renderMarkdown('[evil](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
  });

  it('renders blockquotes', () => {
    const html = renderMarkdown('> quoted');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('quoted');
  });

  it('normalizes escaped \\n literals to real newlines before parsing', () => {
    const html = renderMarkdown('Hello\\n\\n## Heading\\n\\nParagraph');
    expect(html).toContain('<h2');
    expect(html).toContain('Heading');
    expect(html).toContain('<p>');
  });
});
