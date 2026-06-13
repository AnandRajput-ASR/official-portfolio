import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
  category: 'edge' | 'api' | 'data' | 'observability';
  cert?: string;
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
        <p>How this portfolio is built. Hover a node to see which cert taught the pattern.</p>
      </header>

      <div class="cd-canvas">
        <svg viewBox="0 0 800 480" class="cd-svg" role="img" aria-label="Portfolio architecture">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#7a7570" />
            </marker>
          </defs>

          <!-- edges -->
          <line *ngFor="let e of edges" [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" stroke="#7a7570" stroke-width="1.5" marker-end="url(#arrow)" />

          <!-- nodes -->
          <g *ngFor="let n of nodes" [attr.transform]="'translate(' + n.x + ',' + n.y + ')'"
             (mouseenter)="hovered.set(n)" (mouseleave)="hovered.set(null)" class="cd-node">
            <rect
              [attr.width]="180"
              [attr.height]="60"
              rx="6"
              [attr.fill]="categoryFill(n.category)"
              [attr.stroke]="hovered()?.id === n.id ? '#f5a623' : '#252525'"
              stroke-width="2"
            />
            <text x="12" y="22" fill="#f0ede8" font-family="Syne" font-size="13" font-weight="700">
              {{ n.label }}
            </text>
            <text x="12" y="42" fill="#7a7570" font-family="Space Mono" font-size="9" letter-spacing="0.1em">
              {{ categoryLabel(n.category) }}
            </text>
          </g>
        </svg>

        <aside class="cd-info" *ngIf="hovered() as h">
          <h3>{{ h.label }}</h3>
          <p>{{ categoryLabel(h.category) }}</p>
          <p *ngIf="h.cert" class="cd-cert">📜 {{ h.cert }}</p>
        </aside>
        <aside class="cd-info cd-info-empty" *ngIf="!hovered()">
          <p class="cd-hint">Hover a node →</p>
        </aside>
      </div>
    </div>
  `,
  styleUrls: ['./cloud-diagram.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloudDiagramComponent {
  readonly hovered = signal<DiagramNode | null>(null);

  readonly nodes: DiagramNode[] = [
    { id: 'browser', label: 'Browser', x: 50, y: 80, category: 'edge' },
    { id: 'vercel', label: 'Vercel (CDN)', x: 290, y: 80, category: 'edge' },
    { id: 'angular', label: 'Angular 20 SPA', x: 530, y: 80, category: 'edge' },
    { id: 'api', label: 'Express API', x: 290, y: 200, category: 'api', cert: 'AZ-400' },
    { id: 'auth', label: 'JWT + HttpOnly cookie', x: 530, y: 200, category: 'api', cert: 'AZ-500 mindset' },
    { id: 'pg', label: 'Postgres', x: 290, y: 320, category: 'data' },
    { id: 's3', label: 'S3 (uploads)', x: 530, y: 320, category: 'data' },
    { id: 'ci', label: 'GitHub Actions CI', x: 50, y: 200, category: 'observability', cert: 'AZ-400' },
    { id: 'sentry', label: 'Sentry (errors)', x: 50, y: 320, category: 'observability' },
  ];

  readonly edges: { x1: number; y1: number; x2: number; y2: number }[] = [
    { x1: 230, y1: 110, x2: 290, y2: 110 },
    { x1: 470, y1: 110, x2: 530, y2: 110 },
    { x1: 380, y1: 230, x2: 530, y2: 230 },
    { x1: 380, y1: 350, x2: 530, y2: 350 },
    { x1: 140, y1: 230, x2: 290, y2: 230 },
    { x1: 380, y1: 230, x2: 380, y2: 320 },
    { x1: 140, y1: 350, x2: 290, y2: 350 },
  ];

  categoryFill(c: DiagramNode['category']): string {
    return c === 'edge' ? '#1a1a1a' : c === 'api' ? '#141414' : c === 'data' ? '#141414' : '#1a1a1a';
  }

  categoryLabel(c: DiagramNode['category']): string {
    return c === 'edge'
      ? 'Edge / Static'
      : c === 'api'
        ? 'API'
        : c === 'data'
          ? 'Data'
          : 'Observability';
  }
}
