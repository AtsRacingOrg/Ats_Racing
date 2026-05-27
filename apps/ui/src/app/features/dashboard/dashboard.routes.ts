import { Route } from '@angular/router';
import { DashboardLayout } from './layout/dashboard-layout';

export const dashboardRoutes: Route[] = [
  {
    path: '',
    component: DashboardLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'overview',
      },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/overview/overview-page').then(m => m.OverviewPage),
        data: { title: 'Genel Bakış' },
      },
      {
        path: 'files',
        loadComponent: () =>
          import('./pages/files/files-page').then(m => m.FilesPage),
        data: { title: 'Dosyalarım' },
      },
      {
        path: 'tools',
        loadComponent: () =>
          import('./pages/tools/tools-page').then(m => m.ToolsPage),
        data: { title: 'Araçlar' },
      },
    ],
  },
];
