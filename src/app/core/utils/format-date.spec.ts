import { formatRelativeDate } from './format-date';

describe('formatRelativeDate', () => {
  it('returns empty string for empty / null input', () => {
    expect(formatRelativeDate('')).toBe('');
    expect(formatRelativeDate(null)).toBe('');
    expect(formatRelativeDate(undefined)).toBe('');
  });

  it('returns empty string for invalid date string', () => {
    expect(formatRelativeDate('not a date')).toBe('');
  });

  it('returns "just now" for current time', () => {
    expect(formatRelativeDate(new Date().toISOString())).toBe('just now');
  });

  it('returns "Xm ago" for under an hour', () => {
    const d = new Date(Date.now() - 5 * 60_000);
    expect(formatRelativeDate(d.toISOString())).toBe('5m ago');
  });

  it('returns "Xh ago" for under a day', () => {
    const d = new Date(Date.now() - 3 * 60 * 60_000);
    expect(formatRelativeDate(d.toISOString())).toBe('3h ago');
  });

  it('returns "Xd ago" for under a week', () => {
    const d = new Date(Date.now() - 2 * 24 * 60 * 60_000);
    expect(formatRelativeDate(d.toISOString())).toBe('2d ago');
  });

  it('returns a locale date string for older timestamps', () => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    const formatted = formatRelativeDate(d.toISOString());
    // Locale date is something like "5 Jun, 2024" — just check it doesn't
    // match the relative forms.
    expect(['just now', '5m ago']).not.toContain(formatted);
    expect(formatted.length).toBeGreaterThan(0);
  });
});
