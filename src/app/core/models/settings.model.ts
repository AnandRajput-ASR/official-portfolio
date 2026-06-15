import { EntityMetadata } from './api.model';

export interface FreelanceConfig {
  enabled: boolean;
  ctaTitle: string;
  ctaSubtitle: string;
  services: string[];
  showInHero: boolean;
  showInAbout: boolean;
  showCtaSection: boolean;
  showInContact: boolean;
}

export interface LearningItem {
  label: string;
  icon: string;
  type: 'book' | 'course' | 'tech' | 'other';
  url?: string;
}

export interface SiteSettings extends EntityMetadata {
  openToWork: boolean;
  openToWorkText: string;
  sections: {
    testimonials: boolean;
    blog: boolean;
    analytics: boolean;
    skills: boolean;
    certifications: boolean;
    personalProjects: boolean;
    experience: boolean;
    about: boolean;
    hero: boolean;
    stats: boolean;
    companies: boolean;
    contact: boolean;
    footer: boolean;
    ticker: boolean;
    resumeBanner: boolean;
  };
  freelance: FreelanceConfig;
  hero: {
    badgeText: string;
    ctaPrimary: string;
    ctaSecondary: string;
    pills: string[];
    cardTitle: string;
    cardStatusText: string;
    cardStats: { value: string; label: string }[];
    cardSkills: string[];
    extraSkills: string[];
  };
  about: {
    heading: string;
    paragraphs: string[];
    accentureBadge: { company: string; role: string; period: string; award: string };
  };
  ticker: { items: string[] };
  contact: { heading: string; successMessage: string };
  footer: { text: string; copy: string };
  nav: { logoText: string; showResume: boolean };
  /** Canonical public URL of the site (e.g. https://anandrajput.dev).
   *  Used to generate robots.txt Sitemap directive and sitemap.xml <loc> entries
   *  on the backend — change this field to instantly update SEO without redeploying. */
  siteUrl: string;
  /** When true, visitors must enter their email before the resume download begins. */
  resumeProtected: boolean;
  /** Languages enabled on the public site. Codes must match files in public/assets/i18n/.
   *  When only one language is enabled the toggle button is hidden automatically. */
  enabledLanguages: string[];
  /** "Currently learning" widget displayed near the footer. */
  learning: {
    enabled: boolean;
    items: LearningItem[];
  };
  /** Public visitor counter shown in the footer. */
  visitorCount: {
    show: boolean;
    threshold: number; // only display publicly once this many visits recorded
  };
}
