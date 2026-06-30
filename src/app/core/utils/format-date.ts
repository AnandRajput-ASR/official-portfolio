/**
 * Single-source relative date formatter.
 *
 * Returns a short "x minutes ago" / "x hours ago" / locale date string
 * for `iso` timestamps, or the empty string when the input is falsy.
 *
 * Replaces the three near-duplicate `formatDate` methods that previously
 * lived in DashboardComponent, ResumeTabComponent, and MessagesTabComponent.
 */
export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
