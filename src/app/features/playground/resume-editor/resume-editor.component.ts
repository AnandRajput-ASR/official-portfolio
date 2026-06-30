import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastComponent, ToastService } from '@shared/components/toast/toast.component';
import { ResumeData, defaultResumeData, generateLatex } from './resume-latex';

@Component({
  selector: 'app-resume-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ToastComponent],
  templateUrl: './resume-editor.component.html',
  styleUrls: ['./resume-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumeEditorComponent implements OnInit {
  private toast = inject(ToastService);

  readonly data = signal<ResumeData>(defaultResumeData());
  readonly activeSection = signal<string>('header');
  readonly previewMode = signal<'visual' | 'latex'>('visual');

  ngOnInit(): void {
    this.data.set(defaultResumeData());
  }

  setSection(s: string): void {
    this.activeSection.set(s);
  }

  addSkill(): void {
    this.data.update((d) => ({
      ...d,
      skills: [...d.skills, { category: '', items: '' }],
    }));
  }

  removeSkill(i: number): void {
    this.data.update((d) => ({
      ...d,
      skills: d.skills.filter((_, idx) => idx !== i),
    }));
  }

  addCert(): void {
    this.data.update((d) => ({
      ...d,
      certifications: [...d.certifications, { code: '', name: '' }],
    }));
  }

  removeCert(i: number): void {
    this.data.update((d) => ({
      ...d,
      certifications: d.certifications.filter((_, idx) => idx !== i),
    }));
  }

  addEducation(): void {
    this.data.update((d) => ({
      ...d,
      education: [...d.education, { degree: '', university: '', period: '' }],
    }));
  }

  removeEducation(i: number): void {
    this.data.update((d) => ({
      ...d,
      education: d.education.filter((_, idx) => idx !== i),
    }));
  }

  addBullet(expIdx: number, projIdx: number): void {
    this.data.update((d) => {
      const exp = [...d.experience];
      const projs = [...exp[expIdx].projects];
      projs[projIdx] = { ...projs[projIdx], bullets: [...projs[projIdx].bullets, ''] };
      exp[expIdx] = { ...exp[expIdx], projects: projs };
      return { ...d, experience: exp };
    });
  }

  removeBullet(expIdx: number, projIdx: number, bulletIdx: number): void {
    this.data.update((d) => {
      const exp = [...d.experience];
      const projs = [...exp[expIdx].projects];
      projs[projIdx] = {
        ...projs[projIdx],
        bullets: projs[projIdx].bullets.filter((_, i) => i !== bulletIdx),
      };
      exp[expIdx] = { ...exp[expIdx], projects: projs };
      return { ...d, experience: exp };
    });
  }

  addProject(expIdx: number): void {
    this.data.update((d) => {
      const exp = [...d.experience];
      exp[expIdx] = {
        ...exp[expIdx],
        projects: [...exp[expIdx].projects, { name: '', bullets: [''] }],
      };
      return { ...d, experience: exp };
    });
  }

  removeProject(expIdx: number, projIdx: number): void {
    this.data.update((d) => {
      const exp = [...d.experience];
      exp[expIdx] = {
        ...exp[expIdx],
        projects: exp[expIdx].projects.filter((_, i) => i !== projIdx),
      };
      return { ...d, experience: exp };
    });
  }

  getLatex(): string {
    return generateLatex(this.data());
  }

  copyLatex(): void {
    const tex = this.getLatex();
    navigator.clipboard.writeText(tex).then(() => {
      this.toast.success('LaTeX source copied to clipboard!');
    });
  }

  downloadPdf(): void {
    const d = this.data();
    const html = this.buildPrintHtml(d);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 1000);
      }, 300);
    };
  }

  resetToDefaults(): void {
    this.data.set(defaultResumeData());
    this.toast.info('Reset to resume data.');
  }

  trackByIndex(i: number): number {
    return i;
  }

  private buildPrintHtml(d: ResumeData): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const skillRows = d.skills
      .map((s) => `<tr><td class="sk-cat">${esc(s.category)}</td><td>${esc(s.items)}</td></tr>`)
      .join('');

    const expBlocks = d.experience
      .map((exp) => {
        const projects = exp.projects
          .map((p) => {
            const bullets = p.bullets
              .filter((b) => b.trim())
              .map((b) => `<li>${esc(b)}</li>`)
              .join('');
            return `<li><strong>Project: ${esc(p.name)}</strong><ul class="dash">${bullets}</ul></li>`;
          })
          .join('');
        const closing = exp.closing ? `<p class="closing">${esc(exp.closing)}</p>` : '';
        return `
          <div class="exp-block">
            <div class="exp-row"><strong>${esc(exp.title)}</strong><span>${esc(exp.period)}</span></div>
            <div class="exp-row"><em>${esc(exp.company)}</em><em>${esc(exp.location)}</em></div>
            <p class="exp-meta"><strong>Key Projects:</strong> ${esc(exp.keyProjects)}</p>
            <p class="exp-meta"><strong>Tech Stack:</strong> ${esc(exp.techStack)}</p>
            <ul class="projects">${projects}</ul>
            ${closing}
          </div>`;
      })
      .join('');

    const certItems = d.certifications
      .map((c) => `<li><strong>${esc(c.code)}</strong> – ${esc(c.name)}</li>`)
      .join('');

    const eduItems = d.education
      .map(
        (e) =>
          `<div class="exp-row"><strong>${esc(e.degree)}</strong>, ${esc(e.university)}<span>${esc(e.period)}</span></div>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(d.name)} - Resume</title>
<style>
@page { margin: 0.7in; size: A4; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Times New Roman', serif; font-size: 10pt; line-height: 1.4; color: #000; }
.header { text-align: center; margin-bottom: 8pt; }
.header h1 { font-size: 18pt; letter-spacing: 2pt; margin-bottom: 4pt; }
.header p { font-size: 10pt; }
.header a { color: #000; }
.section-title { font-size: 12pt; font-weight: bold; border-bottom: 1.5px solid #000; padding-bottom: 2pt; margin: 10pt 0 6pt; }
.sk-table { width: 100%; border-collapse: collapse; }
.sk-table td { padding: 2pt 8pt 2pt 0; font-size: 10pt; vertical-align: top; }
.sk-cat { font-weight: bold; white-space: nowrap; width: 100pt; }
.exp-block { margin-bottom: 6pt; }
.exp-row { display: flex; justify-content: space-between; }
.exp-meta { margin: 3pt 0; font-size: 10pt; }
.closing { font-style: italic; margin: 4pt 0; font-size: 10pt; }
ul { padding-left: 18pt; margin: 4pt 0; }
ul.dash { list-style: none; padding-left: 14pt; }
ul.dash li::before { content: '– '; margin-left: -14pt; }
ul.projects > li { list-style: disc; margin: 4pt 0; }
li { font-size: 10pt; margin: 1pt 0; }
</style></head><body>
<div class="header">
  <h1>${esc(d.name).toUpperCase()}</h1>
  <p>${esc(d.phone)} ◇ ${esc(d.location)}</p>
  <p><a href="mailto:${esc(d.email)}">${esc(d.email)}</a> ◇ <a href="${esc(d.linkedin)}">LinkedIn</a></p>
</div>
<div class="section-title">OBJECTIVE</div>
<p>${esc(d.objective)}</p>
<div class="section-title">SKILLS</div>
<table class="sk-table">${skillRows}</table>
<div class="section-title">EXPERIENCE</div>
${expBlocks}
<div class="section-title">CERTIFICATIONS</div>
<p style="font-style:italic;margin-bottom:4pt;">Certified across Microsoft Azure Fundamentals, Administration, Development, and DevOps.</p>
<ul>${certItems}</ul>
<div class="section-title">EDUCATION</div>
${eduItems}
</body></html>`;
  }
}
