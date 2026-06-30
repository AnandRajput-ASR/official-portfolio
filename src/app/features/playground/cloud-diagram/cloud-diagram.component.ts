import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface DiagramNode {
  id: string;
  label: string;
  sub: string;
  x: number;
  y: number;
  category: 'client' | 'cdn' | 'api' | 'data' | 'devops' | 'security';
  cert?: string;
  description?: string;
}

@Component({
  selector: 'app-cloud-diagram',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="cd-page">
      <header class="cd-header">
        <a routerLink="/playground" class="cd-back">← Playground</a>
        <h1>Cloud Architecture Diagram</h1>
        <p>How this portfolio is built — from browser to database. Hover a node for details.</p>
      </header>

      <div class="cd-canvas">
        <svg viewBox="0 0 920 520" class="cd-svg" role="img" aria-label="Portfolio architecture diagram">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="var(--muted)" />
            </marker>
          </defs>

          <!-- layer labels -->
          <text x="20" y="36" fill="var(--muted)" font-family="Space Mono" font-size="9" letter-spacing="0.12em" text-transform="uppercase">CLIENT</text>
          <text x="20" y="166" fill="var(--muted)" font-family="Space Mono" font-size="9" letter-spacing="0.12em" text-transform="uppercase">EDGE / CDN</text>
          <text x="20" y="286" fill="var(--muted)" font-family="Space Mono" font-size="9" letter-spacing="0.12em" text-transform="uppercase">API LAYER</text>
          <text x="20" y="416" fill="var(--muted)" font-family="Space Mono" font-size="9" letter-spacing="0.12em" text-transform="uppercase">DATA + AUTH</text>

          <!-- edges -->
          <line *ngFor="let e of edges" [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2"
                stroke="var(--border)" stroke-width="1.5" marker-end="url(#arrow)" opacity="0.7" />

          <!-- nodes -->
          <g *ngFor="let n of nodes" [attr.transform]="'translate(' + n.x + ',' + n.y + ')'"
             (mouseenter)="hovered.set(n)" (mouseleave)="hovered.set(null)" class="cd-node" style="cursor:pointer">
            <rect
              width="160" height="56" rx="6"
              [attr.fill]="categoryFill(n.category)"
              [attr.stroke]="hovered()?.id === n.id ? 'var(--amber)' : 'var(--border)'"
              stroke-width="1.5"
            />
            <text x="12" y="22" fill="var(--text)" font-family="Syne" font-size="12" font-weight="700">
              {{ n.label }}
            </text>
            <text x="12" y="40" fill="var(--muted)" font-family="Space Mono" font-size="8.5" letter-spacing="0.08em">
              {{ n.sub }}
            </text>
            <text *ngIf="showCerts && n.cert" x="148" y="14" fill="var(--amber)" font-size="11" text-anchor="end">📜</text>
          </g>
        </svg>

        <aside class="cd-info" *ngIf="hovered() as h">
          <h3>{{ h.label }}</h3>
          <p class="cd-info-cat">{{ categoryLabel(h.category) }}</p>
          <p class="cd-info-desc">{{ h.description }}</p>
          <p *ngIf="showCerts && h.cert" class="cd-cert">📜 {{ h.cert }}</p>
        </aside>
        <aside class="cd-info cd-info-empty" *ngIf="!hovered()">
          <p class="cd-hint">Hover a node →</p>
          <p class="cd-hint-sub">See how each piece connects.</p>
        </aside>
      </div>
    </div>
  `,
  styleUrls: ['./cloud-diagram.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloudDiagramComponent {
  // Set to true to show certification badges on nodes
  readonly showCerts = false;
  readonly hovered = signal<DiagramNode | null>(null);

  readonly nodes: DiagramNode[] = [
    // Row 1 — Client
    { id: 'browser', label: 'Browser', sub: 'SPA + Service Worker', x: 60, y: 48, category: 'client', description: 'End-user browser loads the Angular SPA with lazy-loaded routes and web-vitals tracking.' },
    { id: 'angular', label: 'Angular 20', sub: 'TypeScript + SCSS', x: 260, y: 48, category: 'client', description: 'Standalone components, signals, OnPush strategy, i18n. Built with esbuild via @angular/build.' },
    { id: 'dx', label: 'Dev Tooling', sub: 'ESLint + Prettier + Husky', x: 460, y: 48, category: 'devops', description: 'Pre-commit hooks run lint-staged (ESLint + Prettier). Ensures consistent code quality across commits.' },

    // Row 2 — Edge
    { id: 'vercel', label: 'Vercel', sub: 'CDN + Edge Network', x: 60, y: 178, category: 'cdn', cert: 'AZ-204', description: 'Static frontend deployed on Vercel edge network. Automatic preview deploys per PR, global CDN.' },
    { id: 'dompurify', label: 'DOMPurify', sub: 'XSS Prevention', x: 260, y: 178, category: 'security', description: 'All user-generated HTML (blog markdown, comments) sanitized client-side before rendering via innerHTML.' },
    { id: 'webvitals', label: 'Web Vitals', sub: 'CWV Observability', x: 460, y: 178, category: 'devops', description: 'Collects LCP, FID, CLS metrics in production. Feeds analytics dashboard for performance monitoring.' },

    // Row 3 — API
    { id: 'express', label: 'Express API', sub: 'Node.js on Render', x: 60, y: 298, category: 'api', cert: 'AZ-400', description: 'RESTful API handling content CRUD, auth, analytics, and blog social interactions. Deployed on Render.' },
    { id: 'auth', label: 'Auth Layer', sub: 'JWT + HttpOnly Cookies', x: 260, y: 298, category: 'security', cert: 'AZ-500', description: 'Session cookies (HttpOnly, Secure, SameSite=Lax) for admin. JWT fallback for local dev. Token refresh flow.' },
    { id: 'resume', label: 'Resume Engine', sub: 'PDF Generation', x: 460, y: 298, category: 'api', description: 'Generates downloadable PDF resume from structured data. Tracks funnel (view → click → download).' },

    // Row 4 — Data
    { id: 'supabase', label: 'Supabase', sub: 'PostgreSQL + Auth', x: 60, y: 428, category: 'data', description: 'Managed Postgres for all portfolio content, blog posts, analytics events, and user sessions.' },
    { id: 'storage', label: 'File Storage', sub: 'Supabase Storage', x: 260, y: 428, category: 'data', description: 'Blog cover images, uploaded screenshots, and resume PDF stored in Supabase object storage.' },
    { id: 'analytics', label: 'Analytics', sub: 'Event Tracking', x: 460, y: 428, category: 'data', description: 'Page views, project clicks, resume funnel, contact conversions. All stored in Postgres via the API.' },
  ];

  readonly edges = [
    // Browser → Angular
    { x1: 220, y1: 76, x2: 260, y2: 76 },
    // Angular → Dev Tooling
    { x1: 420, y1: 76, x2: 460, y2: 76 },
    // Browser → Vercel (down)
    { x1: 140, y1: 104, x2: 140, y2: 178 },
    // Angular → DOMPurify (down)
    { x1: 340, y1: 104, x2: 340, y2: 178 },
    // Angular → Web Vitals (down)
    { x1: 540, y1: 104, x2: 540, y2: 178 },
    // Vercel → Express (down)
    { x1: 140, y1: 234, x2: 140, y2: 298 },
    // DOMPurify → Auth (down)
    { x1: 340, y1: 234, x2: 340, y2: 298 },
    // Web Vitals → Resume (down)
    { x1: 540, y1: 234, x2: 540, y2: 298 },
    // Express → Auth (right)
    { x1: 220, y1: 326, x2: 260, y2: 326 },
    // Auth → Resume (right)
    { x1: 420, y1: 326, x2: 460, y2: 326 },
    // Express → Supabase (down)
    { x1: 140, y1: 354, x2: 140, y2: 428 },
    // Auth → Storage (down)
    { x1: 340, y1: 354, x2: 340, y2: 428 },
    // Resume → Analytics (down)
    { x1: 540, y1: 354, x2: 540, y2: 428 },
  ];

  categoryFill(c: DiagramNode['category']): string {
    const fills: Record<string, string> = {
      client: 'color-mix(in srgb, var(--surface) 90%, var(--amber) 10%)',
      cdn: 'var(--surface)',
      api: 'color-mix(in srgb, var(--surface) 85%, var(--green) 15%)',
      data: 'var(--surface2)',
      devops: 'var(--surface)',
      security: 'color-mix(in srgb, var(--surface) 90%, var(--amber) 10%)',
    };
    return fills[c] ?? 'var(--surface)';
  }

  categoryLabel(c: DiagramNode['category']): string {
    const labels: Record<string, string> = {
      client: 'Client Layer',
      cdn: 'Edge / CDN',
      api: 'API Layer',
      data: 'Data Layer',
      devops: 'DevOps & DX',
      security: 'Security',
    };
    return labels[c] ?? c;
  }
}
