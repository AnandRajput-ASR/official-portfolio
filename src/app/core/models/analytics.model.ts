import { EntityMetadata } from './api.model';

export interface DailyVisit {
  date: string; // 'YYYY-MM-DD'
  count: number;
}

export interface Analytics extends EntityMetadata {
  pageViews: number;
  resumeDownloads: number;
  contactFormViews: number;
  contactFormSubmissions: number;
  blogPostViews: number;
  projectLinkClicks: number;
  socialLinkClicks: number;
  projectClicks: Record<string, number>;
  lastReset: string;
  /** Time-series data for the last 30 days */
  dailyVisits?: DailyVisit[];
  /** Visitors logged this calendar month (from page_visit_log) */
  thisMonth?: number;
  /** Visitors logged last calendar month */
  lastMonth?: number;
}
