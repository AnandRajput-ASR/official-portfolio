import {
    Analytics,
    Company,
    CompanyProject,
    Experience,
    Hero,
    PersonalProject,
    PortfolioContent,
    SiteSettings,
    Testimonial,
} from '@core/models';
import { asDict, Dict, list, notDeleted, unwrapData } from './normalizer-helpers';

function singleton<T>(value: unknown): T | undefined {
  if (!Array.isArray(value)) return value as T | undefined;
  return (value.find((row) => asDict(row)['is_deleted'] !== true) ?? value[0]) as T | undefined;
}

function monthYearLabel(value: string): string {
  const normalized = value.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(normalized)) return value;
  const [year, month] = normalized.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return value;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${year}`;
}

function canonicalCompanyStartDate(company: Company): string | undefined {
  return company.start_date_d ?? company.start_date ?? company.startDate;
}

function canonicalCompanyEndDate(company: Company): string | undefined {
  return company.end_date_d ?? company.end_date ?? company.endDate;
}

function canonicalExperienceStartDate(experience: Experience): string | undefined {
  return experience.start_date_d ?? experience.start_date ?? experience.startDate;
}

function canonicalExperienceEndDate(experience: Experience): string | undefined {
  return experience.end_date_d ?? experience.end_date ?? experience.endDate;
}

function experiencePeriod(exp: Experience): string {
  const start = exp.startDate;
  const end = exp.endDate;
  if (!start) return exp.period;
  if (!end) return `${monthYearLabel(start)} — Present`;
  return `${monthYearLabel(start)} — ${monthYearLabel(end)}`;
}

export function normalizeCompanyProject(project: CompanyProject): CompanyProject {
  return {
    ...project,
    status: project.status_v2 ?? project.status,
  };
}

export function normalizeCompany(company: Company): Company {
  const projects = list<CompanyProject>(company.projects)
    .filter(notDeleted)
    .map(normalizeCompanyProject);

  return {
    ...company,
    startDate: canonicalCompanyStartDate(company),
    endDate: canonicalCompanyEndDate(company),
    projects,
  };
}

export function normalizePersonalProject(project: PersonalProject): PersonalProject {
  return {
    ...project,
    status: project.status_v2 ?? project.status,
    type: project.type_v2 ?? project.type,
  };
}

export function normalizeTestimonial(testimonial: Testimonial): Testimonial {
  return {
    ...testimonial,
    status: testimonial.status_v2 ?? testimonial.status,
  };
}

export function normalizeExperience(experience: Experience): Experience {
  const next = {
    ...experience,
    startDate: canonicalExperienceStartDate(experience),
    endDate: canonicalExperienceEndDate(experience),
  };

  if (next.startDate || next.endDate) {
    next.period = experiencePeriod(next);
  }

  return next;
}

function normalizeSettings(rawSettings: unknown, rawContact: unknown): SiteSettings {
  const settings = (singleton<SiteSettings>(rawSettings) ?? {}) as SiteSettings;
  const contact = singleton<Record<string, unknown>>(rawContact);
  if (!contact) return settings;

  return {
    ...settings,
    contact: {
      ...(settings.contact ?? {}),
      ...contact,
    },
  } as SiteSettings;
}

export function normalizePortfolioContent(rawContent: unknown): PortfolioContent {
  const payload = asDict(unwrapData(rawContent));
  const content = payload as PortfolioContent & Dict;

  const hero = singleton<Hero>(content.hero) ?? ({} as Hero);
  const analytics = (singleton<Analytics>(content.analytics) ?? {}) as Analytics;
  const siteSettings = normalizeSettings(
    content.siteSettings ?? content['site_settings'],
    content['contactInformation'] ?? content['contact_information'],
  );

  return {
    ...content,
    hero,
    analytics,
    siteSettings,
    skills: list(content.skills).filter(notDeleted),
    companies: list<Company>(content.companies).filter(notDeleted).map(normalizeCompany),
    personalProjects: list<PersonalProject>(content.personalProjects ?? content['personal_projects'])
      .filter(notDeleted)
      .map(normalizePersonalProject),
    experience: list<Experience>(content.experience).filter(notDeleted).map(normalizeExperience),
    stats: list(content.stats).filter(notDeleted),
    certifications: list(content.certifications).filter(notDeleted),
    testimonials: list<Testimonial>(content.testimonials).filter(notDeleted).map(normalizeTestimonial),
    blogPosts: list(content.blogPosts ?? content['blog_posts']).filter(notDeleted),
  } as PortfolioContent;
}

export function normalizeTestimonialsBuckets(rawValue: unknown): {
  approved: Testimonial[];
  pending: Testimonial[];
} {
  const payload = asDict(unwrapData(rawValue));
  return {
    approved: list<Testimonial>(payload['approved']).filter(notDeleted).map(normalizeTestimonial),
    pending: list<Testimonial>(payload['pending']).filter(notDeleted).map(normalizeTestimonial),
  };
}

export function normalizeAnalytics(rawAnalytics: unknown): Analytics {
  const payload = unwrapData(rawAnalytics);
  return ((singleton<Analytics>(payload) ?? {}) as Analytics);
}

export function normalizeSettingsSingleton(rawSettings: unknown): SiteSettings {
  return normalizeSettings(rawSettings, undefined);
}
