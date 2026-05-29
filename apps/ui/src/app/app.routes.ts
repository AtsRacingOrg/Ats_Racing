import { Route } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { authGuard } from './core/auth/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.adminRoutes),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(m => m.dashboardRoutes),
  },
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/home/home-page'),
        data: { title: 'Anasayfa' },
      },
      {
        path: 'about',
        loadComponent: () => import('./features/about/about-page'),
        data: { title: 'Hakkımızda' },
      },
      {
        path: 'contact',
        loadComponent: () => import('./features/contact/contact-page'),
        data: { title: 'İletişim' },
      },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login-page'),
        data: { title: 'Giriş Yap' },
      },
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
];
