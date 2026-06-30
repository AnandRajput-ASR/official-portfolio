import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ContentService } from '@core/services/content.service';
import { GlobalLoaderComponent } from '@shared/components/global-loader/global-loader.component';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GlobalLoaderComponent],
  template: `
    <app-global-loader />
    <router-outlet />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly contentService = inject(ContentService);
  private readonly destroyRef = inject(DestroyRef);
  private lastTrackedUrl: string | null = null;

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        const url = event.urlAfterRedirects || event.url;
        if (!this.shouldTrackPage(url) || url === this.lastTrackedUrl) {
          return;
        }

        this.lastTrackedUrl = url;
        this.contentService.trackEvent('pageView', { path: url });
      });
  }

  private shouldTrackPage(url: string): boolean {
    return !(url.startsWith('/admin') || url.startsWith('/playground'));
  }
}
