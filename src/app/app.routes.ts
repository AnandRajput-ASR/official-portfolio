import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { secretSlugGuard } from '@core/guards/secret-slug.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'blog',
    loadComponent: () =>
      import('@features/blog/blog-list/blog-list.component').then((m) => m.BlogListComponent),
  },
  {
    path: 'admin/dashboard',
    canMatch: [authGuard],
    loadComponent: () =>
      import('@features/admin/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'blog/:slug',
    loadComponent: () =>
      import('@features/blog/blog-view.component').then((m) => m.BlogViewComponent),
  },
  {
    path: 'playground',
    loadComponent: () =>
      import('@features/playground/playground.component').then((m) => m.PlaygroundComponent),
  },
  {
    path: 'playground/resume',
    loadComponent: () =>
      import('@features/playground/resume-editor/resume-editor.component').then(
        (m) => m.ResumeEditorComponent,
      ),
  },
  {
    path: 'playground/diagram',
    loadComponent: () =>
      import('@features/playground/cloud-diagram/cloud-diagram.component').then(
        (m) => m.CloudDiagramComponent,
      ),
  },
  // Secret admin entry — e.g. /secure-portal-ar2026
  // slug is verified against backend; wrong slug → redirect home
  {
    path: ':slug',
    canMatch: [secretSlugGuard],
    loadComponent: () =>
      import('@features/admin/login/login.component').then((m) => m.LoginComponent),
  },
  { path: '**', redirectTo: '' },
];
