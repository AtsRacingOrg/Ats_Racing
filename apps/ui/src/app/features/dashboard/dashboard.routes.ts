import { Route } from '@angular/router';
import { DashboardLayout } from './layout/dashboard-layout';
import { OverviewPage } from './pages/overview/overview-page';
import { FilesPage } from './pages/files/files-page';

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
        component: OverviewPage,
        data: { title: 'Genel Bakış' },
      },
      {
        path: 'files',
        component: FilesPage,
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
