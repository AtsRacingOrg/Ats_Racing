import { Route } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';

export const appRoutes: Route[] = [
  {
    path: 'dashboard',
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
