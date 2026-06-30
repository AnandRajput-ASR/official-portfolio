import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  Analytics,
  ApiResponse,
  BlogPost,
  Certification,
  Company,
  CompanyProject,
  Experience,
  Hero,
  PersonalProject,
  PortfolioContent,
  SiteSettings,
  Skill,
  Stat,
  Testimonial,
} from '@core/models';
import { AuditLogService } from '@core/services/audit-log.service';
import {
  normalizeAnalytics,
  normalizeCompany,
  normalizeCompanyProject,
  normalizeExperience,
  normalizePersonalProject,
  normalizePortfolioContent,
  normalizeTestimonial,
  normalizeTestimonialsBuckets,
} from '@core/utils/wave2-compat';
import { environment } from '@env/environment';
import { map, MonoTypeOperatorFunction, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);
  private audit = inject(AuditLogService);

  private base = environment.api.baseUrl + '/admin';

  private auditOnSuccess<T>(
    tab: string,
    action: 'save' | 'delete' | 'add' | 'revert' | 'upload',
    summary: string,
  ): MonoTypeOperatorFunction<T> {
    return tap(() => this.audit.log(tab, action, summary));
  }

  getAll(): Observable<PortfolioContent> {
    return this.http
      .get<unknown>(this.base + '/page-content')
      .pipe(map((res) => normalizePortfolioContent(res)));
  }

  updateHeroSection(heroContent: Hero): Observable<ApiResponse<Hero>> {
    return this.http
      .put<ApiResponse<Hero | Hero[]>>(this.base + '/heroSection', heroContent)
      .pipe(
        map((res) => ({
          ...res,
          data: normalizePortfolioContent({ hero: res.data }).hero,
        })),
        this.auditOnSuccess('hero', 'save', 'Saved hero content'),
      );
  }

  updateSkills(s: Skill[]): Observable<ApiResponse<Skill[]>> {
    return this.http
      .put<ApiResponse<Skill[]>>(this.base + '/skills', s)
      .pipe(this.auditOnSuccess('skills', 'save', 'Saved skills'));
  }

  addSkill(s: Skill): Observable<ApiResponse<Skill>> {
    return this.http
      .post<ApiResponse<Skill>>(this.base + '/skills', s)
      .pipe(this.auditOnSuccess('skills', 'add', 'Added skill'));
  }

  deleteSkill(id: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(this.base + '/skills/' + id)
      .pipe(this.auditOnSuccess('skills', 'delete', 'Deleted skill'));
  }

  updateCompanies(c: Company[]): Observable<ApiResponse<Company[]>> {
    return this.http
      .put<ApiResponse<Company[]>>(this.base + '/companies', c)
      .pipe(this.auditOnSuccess('companies', 'save', 'Saved companies'));
  }

  addCompany(c: Partial<Company>): Observable<ApiResponse<Company>> {
    return this.http
      .post<ApiResponse<Company>>(this.base + '/companies', c)
      .pipe(
        map((res) => ({ ...res, data: res.data ? normalizeCompany(res.data) : res.data })),
        this.auditOnSuccess('companies', 'add', 'Added company'),
      );
  }

  deleteCompany(id: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(this.base + '/companies/' + id)
      .pipe(this.auditOnSuccess('companies', 'delete', 'Deleted company'));
  }

  addCompanyProject(
    coId: string,
    p: Partial<CompanyProject>,
  ): Observable<ApiResponse<CompanyProject>> {
    return this.http
      .post<ApiResponse<CompanyProject>>(`${this.base}/companies/${coId}/projects`, p)
      .pipe(
        map((res) => ({
          ...res,
          data: res.data ? normalizeCompanyProject(res.data) : res.data,
        })),
        this.auditOnSuccess('companies', 'add', 'Added company project'),
      );
  }

  deleteCompanyProject(pid: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(`${this.base}/projects/${pid}`)
      .pipe(this.auditOnSuccess('companies', 'delete', 'Deleted company project'));
  }

  updatePersonalProjects(p: PersonalProject[]): Observable<ApiResponse<PersonalProject[]>> {
    return this.http
      .put<ApiResponse<PersonalProject[]>>(this.base + '/personal-projects', p)
      .pipe(this.auditOnSuccess('personal', 'save', 'Saved side projects'));
  }

  addPersonalProject(p: Partial<PersonalProject>): Observable<ApiResponse<PersonalProject>> {
    return this.http
      .post<ApiResponse<PersonalProject>>(this.base + '/personal-projects', p)
      .pipe(
        map((res) => ({
          ...res,
          data: res.data ? normalizePersonalProject(res.data) : res.data,
        })),
        this.auditOnSuccess('personal', 'add', 'Added side project'),
      );
  }

  deletePersonalProject(id: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(this.base + '/personal-projects/' + id)
      .pipe(this.auditOnSuccess('personal', 'delete', 'Deleted side project'));
  }

  updateExperience(e: Experience[]): Observable<ApiResponse<Experience[]>> {
    return this.http
      .put<ApiResponse<Experience[]>>(this.base + '/experience', e)
      .pipe(this.auditOnSuccess('experience', 'save', 'Saved timeline entries'));
  }

  addExperience(e: Experience): Observable<ApiResponse<Experience>> {
    return this.http
      .post<ApiResponse<Experience>>(this.base + '/experience', e)
      .pipe(
        map((res) => ({ ...res, data: res.data ? normalizeExperience(res.data) : res.data })),
        this.auditOnSuccess('experience', 'add', 'Added timeline entry'),
      );
  }

  deleteExperience(id: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(this.base + '/experience/' + id)
      .pipe(this.auditOnSuccess('experience', 'delete', 'Deleted timeline entry'));
  }

  updateStats(s: Stat[]): Observable<ApiResponse<Stat[]>> {
    return this.http
      .put<ApiResponse<Stat[]>>(this.base + '/stats', s)
      .pipe(this.auditOnSuccess('stats', 'save', 'Saved about stats'));
  }

  updateCertifications(c: Certification[]): Observable<ApiResponse<Certification[]>> {
    return this.http
      .put<ApiResponse<Certification[]>>(this.base + '/certifications', c)
      .pipe(this.auditOnSuccess('certifications', 'save', 'Saved certifications'));
  }

  addCertification(c: Partial<Certification>): Observable<ApiResponse<Certification>> {
    return this.http
      .post<ApiResponse<Certification>>(this.base + '/certifications', c)
      .pipe(this.auditOnSuccess('certifications', 'add', 'Added certification'));
  }

  deleteCertification(id: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(this.base + '/certifications/' + id)
      .pipe(this.auditOnSuccess('certifications', 'delete', 'Deleted certification'));
  }

  getAllTestimonials(): Observable<{ approved: Testimonial[]; pending: Testimonial[] }> {
    return this.http
      .get<unknown>(this.base + '/testimonials/all')
      .pipe(map((res) => normalizeTestimonialsBuckets(res)));
  }

  updateTestimonials(t: Testimonial[]): Observable<ApiResponse<Testimonial[]>> {
    return this.http
      .put<ApiResponse<Testimonial[]>>(this.base + '/testimonials', t)
      .pipe(this.auditOnSuccess('testimonials', 'save', 'Saved testimonials'));
  }

  addTestimonial(t: Partial<Testimonial>): Observable<ApiResponse<Testimonial>> {
    return this.http
      .post<ApiResponse<Testimonial>>(this.base + '/testimonials', t)
      .pipe(
        map((res) => ({ ...res, data: res.data ? normalizeTestimonial(res.data) : res.data })),
        this.auditOnSuccess('testimonials', 'add', 'Added testimonial'),
      );
  }

  updateTestimonial(id: string, d: Partial<Testimonial>): Observable<ApiResponse<Testimonial>> {
    return this.http
      .put<ApiResponse<Testimonial>>(this.base + '/testimonials/' + id, d)
      .pipe(
        map((res) => ({ ...res, data: res.data ? normalizeTestimonial(res.data) : res.data })),
        this.auditOnSuccess('testimonials', 'save', 'Updated testimonial'),
      );
  }

  deleteTestimonial(id: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(this.base + '/testimonials/' + id)
      .pipe(this.auditOnSuccess('testimonials', 'delete', 'Deleted testimonial'));
  }

  approveTestimonial(id: string): Observable<ApiResponse<Testimonial>> {
    return this.http
      .put<ApiResponse<Testimonial>>(`${this.base}/testimonials/pending/${id}/approve`, {})
      .pipe(
        map((res) => ({ ...res, data: res.data ? normalizeTestimonial(res.data) : res.data })),
        this.auditOnSuccess('testimonials', 'save', 'Approved pending testimonial'),
      );
  }

  rejectTestimonial(id: string): Observable<ApiResponse> {
    return this.http
      .put<ApiResponse>(`${this.base}/testimonials/pending/${id}/reject`, {})
      .pipe(this.auditOnSuccess('testimonials', 'revert', 'Rejected pending testimonial'));
  }

  deletePendingTestimonial(id: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(`${this.base}/testimonials/pending/${id}`)
      .pipe(this.auditOnSuccess('testimonials', 'delete', 'Deleted pending testimonial'));
  }

  updateBlogPosts(p: BlogPost[]): Observable<ApiResponse<BlogPost[]>> {
    return this.http
      .put<ApiResponse<BlogPost[]>>(this.base + '/blog', p)
      .pipe(this.auditOnSuccess('blog', 'save', 'Saved blog posts'));
  }

  addBlogPost(p: Partial<BlogPost>): Observable<ApiResponse<BlogPost>> {
    return this.http
      .post<ApiResponse<BlogPost>>(this.base + '/blog', p)
      .pipe(this.auditOnSuccess('blog', 'add', 'Added blog post'));
  }

  updateBlogPost(id: string, d: Partial<BlogPost>): Observable<ApiResponse<BlogPost>> {
    return this.http
      .put<ApiResponse<BlogPost>>(this.base + '/blog/' + id, d)
      .pipe(this.auditOnSuccess('blog', 'save', 'Updated blog post'));
  }

  deleteBlogPost(id: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(this.base + '/blog/' + id)
      .pipe(this.auditOnSuccess('blog', 'delete', 'Deleted blog post'));
  }

  getAnalytics(): Observable<Analytics> {
    return this.http.get<unknown>(this.base + '/analytics').pipe(map((r) => normalizeAnalytics(r)));
  }

  resetAnalytics(): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(this.base + '/analytics/reset')
      .pipe(this.auditOnSuccess('analytics', 'revert', 'Reset analytics counters'));
  }

  updateSettings(s: Partial<SiteSettings>): Observable<ApiResponse<SiteSettings>> {
    return this.http
      .put<ApiResponse<SiteSettings>>(this.base + '/settings', s)
      .pipe(this.auditOnSuccess('settings', 'save', 'Saved site settings'));
  }
}
