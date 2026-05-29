import { Route } from '@angular/router';
import { AdminLayout } from './layout/admin-layout';
import { adminGuard } from '../../core/auth/auth.guard';

export const adminRoutes: Route[] = [
  {
    path: '',
    component: AdminLayout,
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        loadComponent: () => import('./pages/overview/admin-overview-page').then(m => m.AdminOverviewPage),
        data: { title: 'Genel Bakış' },
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/admin-users-page').then(m => m.AdminUsersPage),
        data: { title: 'Kullanıcılar' },
      },
      {
        path: 'dealers',
        loadComponent: () => import('./pages/users/admin-users-page').then(m => m.AdminUsersPage),
        data: { title: 'Bayiler' },
      },
      {
        path: 'orders',
        loadComponent: () => import('./pages/orders/admin-orders-page').then(m => m.AdminOrdersPage),
        data: { title: 'Siparişler' },
      },
      {
        path: 'tickets',
        loadComponent: () => import('./pages/tickets/admin-tickets-page').then(m => m.AdminTicketsPage),
        data: { title: 'Ticketlar' },
      },
    ],
  },
];
