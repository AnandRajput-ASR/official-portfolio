/**
 * Pure helpers for the companies / projects admin tab.
 *
 * These are stateless functions of their inputs. They used to live as
 * methods on DashboardComponent; moving them here lets CompaniesTabComponent
 * stay slim and the functions become tree-shakeable, unit-testable in
 * isolation, and reusable elsewhere.
 */
import { Company, CompanyProject, ProjectStatus } from '@core/models';

/** Module-level month name list — previously rebuilt on every keystroke. */
export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Project status options used by the inline status select. */
export const PROJECT_STATUSES: { value: ProjectStatus; label: string; icon: string }[] = [
  { value: null, label: 'No Status', icon: '—' },
  { value: 'completed', label: 'Completed', icon: '✅' },
  { value: 'in-progress', label: 'In Progress', icon: '🔄' },
  { value: 'planned', label: 'Planned', icon: '📅' },
  { value: 'archived', label: 'Archived', icon: '📦' },
];

function effectiveStatus(project: CompanyProject): ProjectStatus {
  return project.status_v2 ?? project.status ?? null;
}

export function projectStatusLabel(status?: ProjectStatus): string {
  return PROJECT_STATUSES.find((s) => s.value === (status ?? null))?.label ?? 'No Status';
}

export function projectStatusIcon(status?: ProjectStatus): string {
  return PROJECT_STATUSES.find((s) => s.value === (status ?? null))?.icon ?? '—';
}

/** Convert a "YYYY-MM" string to a numeric month-stamp (year*12+month). */
export function monthStamp(value: string | undefined): number | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return year * 12 + month;
}

/** True when both start and end are valid month-stamps and end < start. */
export function hasInvalidDateRange(co: Company): boolean {
  const start = monthStamp(co.startDate);
  const end = monthStamp(co.endDate);
  if (start === null || end === null) return false;
  return end < start;
}

/** "2y" / "3mo" / "1y 3mo" tenure label. */
export function calcTenure(co: Company, now: Date = new Date()): string {
  const startDate = co.startDate;
  const endDate = co.endDate;
  if (!startDate) return '';
  const start = monthStamp(startDate);
  if (start === null) return '';
  let endStamp: number;
  if (co.current || !endDate) {
    endStamp = now.getFullYear() * 12 + (now.getMonth() + 1);
  } else {
    const e = monthStamp(endDate);
    if (e === null) return '';
    endStamp = e;
  }
  let months = endStamp - start;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem}mo`;
  if (rem === 0) return `${years}y`;
  return `${years}y ${rem}mo`;
}

/** Validate a website URL — empty is valid, otherwise must be http(s). */
export function isValidWebsite(url: string | undefined): boolean {
  const value = String(url || '').trim();
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Sorted unique tech across all projects of a company, most-used first. */
export function getUniqueTechStack(co: Company): string[] {
  const all = co.projects.flatMap((p) => p.tech);
  return [...new Set(all)].sort((a, b) => getTechProjectCount(co, b) - getTechProjectCount(co, a));
}

export function getTechProjectCount(co: Company, tech: string): number {
  return co.projects.filter((p) => p.tech.includes(tech)).length;
}

/** Lower-cased, trimmed project titles that appear more than once. */
export function getDuplicateProjectTitles(co: Company): string[] {
  const counts = new Map<string, number>();
  for (const proj of co.projects) {
    const key = (proj.title || '').trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
}

export function isDuplicateProjectTitle(co: Company, proj: CompanyProject): boolean {
  const key = (proj.title || '').trim().toLowerCase();
  if (!key) return false;
  return getDuplicateProjectTitles(co).includes(key);
}

export function isProjectDetailsMissing(proj: CompanyProject): boolean {
  const noDescription = !(proj.description || '').trim();
  const noTech = !proj.tech || proj.tech.length === 0;
  return noDescription || noTech;
}

export function getProjectsMissingDetailsCount(co: Company): number {
  return co.projects.filter(isProjectDetailsMissing).length;
}

export function getCompletedCount(co: Company): number {
  return co.projects.filter((p) => {
    const status = effectiveStatus(p);
    return !status || status === 'completed';
  }).length;
}

export function getInProgressCount(co: Company): number {
  return co.projects.filter((p) => effectiveStatus(p) === 'in-progress').length;
}

export function getProjectsWithImpact(co: Company): number {
  return co.projects.filter((p) => p.impact && p.impact.trim()).length;
}

export function getCompletionRate(co: Company): number {
  if (!co.projects.length) return 0;
  return Math.round((getCompletedCount(co) / co.projects.length) * 100);
}

/**
 * Heuristic 0-100 score for an "impact" text. Rewards length, numeric
 * values, KPI keywords, action verbs, and quantified results.
 */
export function impactScore(impact: string | undefined): number {
  const text = String(impact || '').trim();
  if (!text) return 0;

  let score = 25;
  if (text.length >= 30) score += 15;
  if (text.length >= 60) score += 10;
  if (/\d/.test(text)) score += 20;
  if (/%|\$|kpi|ms|sec|users?|revenue|latency|uptime|conversion|roi/i.test(text)) score += 15;
  if (
    /(reduced|increased|improved|optimized|cut|saved|boosted|delivered|automated|scaled)/i.test(text)
  ) {
    score += 15;
  }
  if (/(by\s+\d+|\d+\s*%)/i.test(text)) score += 10;

  return Math.min(100, score);
}

export type ImpactStrength = 'weak' | 'okay' | 'strong';

export function impactStrengthLabel(impact: string | undefined): string {
  const score = impactScore(impact);
  if (score >= 75) return 'Strong';
  if (score >= 45) return 'Okay';
  return 'Weak';
}

export function impactStrengthClass(impact: string | undefined): ImpactStrength {
  const score = impactScore(impact);
  if (score >= 75) return 'strong';
  if (score >= 45) return 'okay';
  return 'weak';
}

/**
 * Build a `Period` string for a company from its start/end dates, e.g.
 * `Jan 2021 — Present`. Mutates `co.period` and returns nothing. Only
 * fills when `co.period` is empty so user-typed values are never clobbered.
 */
export function applyDefaultPeriod(co: Company): void {
  const startDate = co.startDate;
  const endDate = co.endDate;
  if (co.period || !startDate) return;
  const start = monthStamp(startDate);
  if (start === null) return;
  const startYear = Math.floor(start / 12);
  const startMonth = (start % 12) + 1;
  const startStr = `${MONTH_NAMES[startMonth - 1]} ${startYear}`;

  if (co.current || !endDate) {
    co.period = `${startStr} — Present`;
    return;
  }
  const end = monthStamp(endDate);
  if (end === null) {
    co.period = `${startStr} — Present`;
    return;
  }
  const endYear = Math.floor(end / 12);
  const endMonth = (end % 12) + 1;
  co.period = `${startStr} — ${MONTH_NAMES[endMonth - 1]} ${endYear}`;
}
