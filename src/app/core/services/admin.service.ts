import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  ApiResponse,
  Analytics,
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
import { environment } from '@env/environment';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);

  private base = environment.api.baseUrl + '/admin';

  getAll(): Observable<PortfolioContent> {
    return this.http.get<PortfolioContent>(this.base + '/page-content');
  }

  updateHeroSection(heroContent: Hero): Observable<ApiResponse<Hero>> {
    return this.http.put<ApiResponse<Hero>>(this.base + '/heroSection', heroContent);
  }

  updateSkills(s: Skill[]): Observable<ApiResponse<Skill[]>> {
    return this.http.put<ApiResponse<Skill[]>>(this.base + '/skills', s);
  }

  addSkill(s: Skill): Observable<ApiResponse<Skill>> {
    return this.http.post<ApiResponse<Skill>>(this.base + '/skills', s);
  }

  deleteSkill(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(this.base + '/skills/' + id);
  }

  updateCompanies(c: Company[]): Observable<ApiResponse<Company[]>> {
    return this.http.put<ApiResponse<Company[]>>(this.base + '/companies', c);
  }

  addCompany(c: Partial<Company>): Observable<ApiResponse<Company>> {
    return this.http.post<ApiResponse<Company>>(this.base + '/companies', c);
  }

  deleteCompany(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(this.base + '/companies/' + id);
  }

  addCompanyProject(
    coId: string,
    p: Partial<CompanyProject>,
  ): Observable<ApiResponse<CompanyProject>> {
    return this.http.post<ApiResponse<CompanyProject>>(
      `${this.base}/companies/${coId}/projects`,
      p,
    );
  }

  deleteCompanyProject(pid: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.base}/projects/${pid}`);
  }

  updatePersonalProjects(p: PersonalProject[]): Observable<ApiResponse<PersonalProject[]>> {
    return this.http.put<ApiResponse<PersonalProject[]>>(this.base + '/personal-projects', p);
  }

  addPersonalProject(p: Partial<PersonalProject>): Observable<ApiResponse<PersonalProject>> {
    return this.http.post<ApiResponse<PersonalProject>>(this.base + '/personal-projects', p);
  }

  deletePersonalProject(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(this.base + '/personal-projects/' + id);
  }

  updateExperience(e: Experience[]): Observable<ApiResponse<Experience[]>> {
    return this.http.put<ApiResponse<Experience[]>>(this.base + '/experience', e);
  }

  addExperience(e: Experience): Observable<ApiResponse<Experience>> {
    return this.http.post<ApiResponse<Experience>>(this.base + '/experience', e);
  }

  deleteExperience(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(this.base + '/experience/' + id);
  }

  updateStats(s: Stat[]): Observable<ApiResponse<Stat[]>> {
    return this.http.put<ApiResponse<Stat[]>>(this.base + '/stats', s);
  }

  updateCertifications(c: Certification[]): Observable<ApiResponse<Certification[]>> {
    return this.http.put<ApiResponse<Certification[]>>(this.base + '/certifications', c);
  }

  addCertification(c: Partial<Certification>): Observable<ApiResponse<Certification>> {
    return this.http.post<ApiResponse<Certification>>(this.base + '/certifications', c);
  }

  deleteCertification(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(this.base + '/certifications/' + id);
  }

  getAllTestimonials(): Observable<{ approved: Testimonial[]; pending: Testimonial[] }> {
    return this.http.get<{ approved: Testimonial[]; pending: Testimonial[] }>(
      this.base + '/testimonials/all',
    );
  }

  updateTestimonials(t: Testimonial[]): Observable<ApiResponse<Testimonial[]>> {
    return this.http.put<ApiResponse<Testimonial[]>>(this.base + '/testimonials', t);
  }

  addTestimonial(t: Partial<Testimonial>): Observable<ApiResponse<Testimonial>> {
    return this.http.post<ApiResponse<Testimonial>>(this.base + '/testimonials', t);
  }

  updateTestimonial(id: string, d: Partial<Testimonial>): Observable<ApiResponse<Testimonial>> {
    return this.http.put<ApiResponse<Testimonial>>(this.base + '/testimonials/' + id, d);
  }

  deleteTestimonial(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(this.base + '/testimonials/' + id);
  }

  approveTestimonial(id: string): Observable<ApiResponse<Testimonial>> {
    return this.http.put<ApiResponse<Testimonial>>(
      `${this.base}/testimonials/pending/${id}/approve`,
      {},
    );
  }

  rejectTestimonial(id: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.base}/testimonials/pending/${id}/reject`, {});
  }

  deletePendingTestimonial(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.base}/testimonials/pending/${id}`);
  }

  updateBlogPosts(p: BlogPost[]): Observable<ApiResponse<BlogPost[]>> {
    return this.http.put<ApiResponse<BlogPost[]>>(this.base + '/blog', p);
  }

  addBlogPost(p: Partial<BlogPost>): Observable<ApiResponse<BlogPost>> {
    return this.http.post<ApiResponse<BlogPost>>(this.base + '/blog', p);
  }

  updateBlogPost(id: string, d: Partial<BlogPost>): Observable<ApiResponse<BlogPost>> {
    return this.http.put<ApiResponse<BlogPost>>(this.base + '/blog/' + id, d);
  }

  deleteBlogPost(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(this.base + '/blog/' + id);
  }

  getAnalytics(): Observable<Analytics> {
    return this.http
      .get<{ success: boolean; data: Analytics }>(this.base + '/analytics')
      .pipe(map((r) => r.data));
  }

  resetAnalytics(): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(this.base + '/analytics/reset');
  }

  updateSettings(s: Partial<SiteSettings>): Observable<ApiResponse<SiteSettings>> {
    return this.http.put<ApiResponse<SiteSettings>>(this.base + '/settings', s);
  }
}
