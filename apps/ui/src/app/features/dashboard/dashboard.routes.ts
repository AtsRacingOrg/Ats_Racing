import { Route } from '@angular/router';
import { DashboardLayout } from './layout/dashboard-layout';
import { OverviewPage } from './pages/overview/overview-page';
import { OrdersPage } from './pages/orders/orders-page';

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
        path: 'orders',
        component: OrdersPage,
        data: { title: 'Siparişlerim' },
      },
      {
        path: 'tools',
        loadComponent: () =>
          import('./pages/tools/tools-page').then(m => m.ToolsPage),
        data: { title: 'Araçlar' },
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./pages/payments/payments-page').then(m => m.PaymentsPage),
        data: { title: 'Ödeme Borçlarım' },
      },
      {
        path: 'support',
        loadComponent: () =>
          import('./pages/support/support-page').then(m => m.SupportPage),
        data: { title: 'Destek' },
      },
    ],
  },
];
