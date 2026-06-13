import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-playground',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="pg-page">
      <header class="pg-header">
        <span class="pg-eyebrow">⌘ PLAYGROUND</span>
        <h1>Things you can play with</h1>
        <p>
          Two live toys that go beyond a static CV. Edit your way into a live preview; explore
          the architecture behind this site. No login required.
        </p>
      </header>

      <div class="pg-grid">
        <a routerLink="/playground/resume" class="pg-tile">
          <span class="pg-tile-icon">📝</span>
          <h2>Live Resume Editor</h2>
          <p>
            Edit the fields on the left, watch the public homepage preview update in real time
            on the right. Same data model as the live site.
          </p>
          <span class="pg-tile-cta">Open →</span>
        </a>

        <a routerLink="/playground/diagram" class="pg-tile">
          <span class="pg-tile-icon">🏗️</span>
          <h2>Cloud Architecture Diagram</h2>
          <p>
            How this portfolio is built: Azure DevOps, Node.js, Postgres, observability stack.
            Hover any node to see which cert taught the pattern.
          </p>
          <span class="pg-tile-cta">Open →</span>
        </a>
      </div>

      <p class="pg-foot">
        Both toys are open source — see the
        <a href="https://github.com/" target="_blank" rel="noopener">repo</a>
        for the playground code.
      </p>
    </div>
  `,
  styleUrls: ['./playground.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaygroundComponent {}
