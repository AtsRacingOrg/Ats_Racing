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
        redirectTo: 'users',
        pathMatch: 'full',
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
      {
        path: 'registrations',
        loadComponent: () => import('./pages/registrations/admin-registrations-page').then(m => m.AdminRegistrationsPage),
        data: { title: 'Üyelik Başvuruları' },
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/admin-profile-page').then(m => m.AdminProfilePage),
        data: { title: 'Profilim' },
      },
    ],
  },
];
