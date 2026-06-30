import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ContentService } from '@core/services/content.service';
import { Hero } from '@core/models';
import { sanitizeHtml } from '@core/utils/safe-html';

interface DemoHero {
  name: string;
  title: string;
  subtitle: string;
  bio: string;
  email: string;
  linkedin: string;
  github: string;
  location: string;
  availableForWork: boolean;
}

@Component({
  selector: 'app-resume-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="re-page">
      <header class="re-header">
        <a routerLink="/playground" class="re-back">← Playground</a>
        <h1>Live Resume Editor</h1>
        <p>Type on the left, the preview on the right updates as you type. Click Share to copy a link.</p>
      </header>

      <div class="re-grid">
        <section class="re-form">
          <div class="re-field">
            <label>Name</label>
            <input type="text" [(ngModel)]="data().name" (ngModelChange)="onChange()" />
          </div>
          <div class="re-field">
            <label>Job title</label>
            <input type="text" [(ngModel)]="data().title" (ngModelChange)="onChange()" />
          </div>
          <div class="re-field">
            <label>Tagline</label>
            <input type="text" [(ngModel)]="data().subtitle" (ngModelChange)="onChange()" />
          </div>
          <div class="re-field">
            <label>Location</label>
            <input type="text" [(ngModel)]="data().location" (ngModelChange)="onChange()" />
          </div>
          <div class="re-field">
            <label>Email</label>
            <input type="email" [(ngModel)]="data().email" (ngModelChange)="onChange()" />
          </div>
          <div class="re-field">
            <label>LinkedIn URL</label>
            <input type="url" [(ngModel)]="data().linkedin" (ngModelChange)="onChange()" />
          </div>
          <div class="re-field">
            <label>GitHub URL</label>
            <input type="url" [(ngModel)]="data().github" (ngModelChange)="onChange()" />
          </div>
          <div class="re-field">
            <label>Bio</label>
            <textarea
              rows="4"
              [(ngModel)]="data().bio"
              (ngModelChange)="onChange()"
            ></textarea>
          </div>
          <div class="re-field re-toggle">
            <label>
              <input type="checkbox" [(ngModel)]="data().availableForWork" (ngModelChange)="onChange()" />
              Available for work
            </label>
          </div>

          <div class="re-actions">
            <button class="re-btn re-btn-primary" (click)="share()">🔗 Share</button>
            <button class="re-btn" (click)="reset()">↺ Reset to live data</button>
            <span class="re-shared" *ngIf="shared()">Link copied!</span>
          </div>
        </section>

        <section class="re-preview">
          <div class="re-preview-label">Public preview — same data model as the live site</div>
          <div class="re-preview-card" [innerHTML]="preview()"></div>
        </section>
      </div>
    </div>
  `,
  styleUrls: ['./resume-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumeEditorComponent implements OnInit, OnDestroy {
  private contentService = inject(ContentService);

  /** Two-way bound via [(ngModel)] — each edit triggers `onChange()`. */
  readonly data = signal<DemoHero>(this.empty());
  readonly preview = signal<string>('');
  readonly shared = signal<boolean>(false);

  private debounceId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // Seed from the live site's hero if available; otherwise demo data.
    this.contentService.getAll().subscribe({
      next: (c) => {
        const h = c.hero;
        if (h) this.data.set(this.fromHero(h));
        this.onChange();
      },
      error: () => this.onChange(),
    });
  }

  ngOnDestroy(): void {
    if (this.debounceId) clearTimeout(this.debounceId);
  }

  onChange(): void {
    if (this.debounceId) clearTimeout(this.debounceId);
    this.debounceId = setTimeout(() => {
      this.preview.set(this.renderPreview(this.data()));
    }, 200);
  }

  reset(): void {
    this.data.set(this.empty());
    this.onChange();
  }

  share(): void {
    const json = JSON.stringify(this.data());
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/playground/resume?d=${encodeURIComponent(btoa(unescape(encodeURIComponent(json))))}`
        : '';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.shared.set(true);
        setTimeout(() => this.shared.set(false), 2000);
      });
    }
  }

  private empty(): DemoHero {
    return {
      name: 'Your Name',
      title: 'Senior Angular Developer',
      subtitle: 'I build production-grade web apps.',
      bio: '5+ years shipping Angular SPAs. AZ-400 DevOps Engineer Expert.',
      email: 'you@example.com',
      linkedin: 'https://linkedin.com/in/you',
      github: 'https://github.com/you',
      location: 'Pune, India',
      availableForWork: true,
    };
  }

  private fromHero(h: Hero): DemoHero {
    return {
      name: h.name,
      title: h.title,
      subtitle: h.subtitle,
      bio: h.bio,
      email: h.email,
      linkedin: h.linkedin,
      github: h.github,
      location: h.location,
      availableForWork: h.availableForWork,
    };
  }

  /** Builds a self-contained HTML string that mirrors the home hero block. */
  private renderPreview(d: DemoHero): string {
    const safe = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `
      <div class="rh-card">
        ${d.availableForWork ? '<div class="rh-pill">● Open to work</div>' : ''}
        <h1>${safe(d.name)}</h1>
        <h2>${safe(d.title)}</h2>
        <p class="rh-sub">${safe(d.subtitle)}</p>
        <p class="rh-bio">${safe(d.bio)}</p>
        <div class="rh-meta">
          <span>📍 ${safe(d.location)}</span>
          <span>✉ ${safe(d.email)}</span>
          <span>in ${safe(d.linkedin.replace(/^https?:\/\//, ''))}</span>
          <span>gh ${safe(d.github.replace(/^https?:\/\//, ''))}</span>
        </div>
      </div>
      <style>
        body { background:#0d0d0d; color:#f0ede8; font-family:'Syne',sans-serif; padding:1.5rem; margin:0; }
        .rh-card { background:#141414; border:1px solid #f5a623; padding:1.5rem; }
        .rh-pill { display:inline-block; background:rgba(245,166,35,.15); color:#f5a623; padding:.2rem .6rem; font-size:.7rem; font-family:'Space Mono',monospace; margin-bottom:.5rem; }
        h1 { font-size:1.6rem; margin:.25rem 0; }
        h2 { font-size:1.05rem; color:#f5a623; margin:0 0 .5rem; font-weight:600; }
        .rh-sub { color:#7a7570; font-size:.9rem; margin:0 0 .5rem; }
        .rh-bio { font-size:.85rem; line-height:1.5; margin:0 0 1rem; }
        .rh-meta { display:flex; flex-wrap:wrap; gap:.5rem; font-size:.7rem; color:#7a7570; font-family:'Space Mono',monospace; }
        .rh-meta span { background:#1a1a1a; border:1px solid #252525; padding:.2rem .5rem; }
      </style>
    `;
    return sanitizeHtml(html);
  }
}
