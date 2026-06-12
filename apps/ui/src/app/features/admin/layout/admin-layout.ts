import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { Router } from '@angular/router';
import { NotificationsService } from '../../../core/notifications/notifications.service';
import { NotificationBell } from '../../../shared/notification-bell';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LangSwitcher } from '../../../shared/ui/lang-switcher/lang-switcher';
import { ProfileMenu } from '../../../shared/ui/profile-menu/profile-menu';

interface NavItem { labelKey: string; icon: string; route: string; badge?: string; }

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationBell, TranslatePipe, LangSwitcher, ProfileMenu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="adm-shell" [class.adm-shell--collapsed]="collapsed()">

  <!-- SIDEBAR -->
  <aside class="adm-sidebar">
    <div class="adm-sidebar__top">
      <div class="adm-logo" aria-label="ATS Racing Admin">
        <img src="/logo.png" alt="ATS Racing" class="adm-logo__img" />
      </div>
      <button class="adm-collapse-btn" (click)="collapsed.set(!collapsed())" aria-label="Daralt">
        <i class="pi" [class.pi-chevron-left]="!collapsed()" [class.pi-chevron-right]="collapsed()"></i>
      </button>
    </div>

    <nav class="adm-nav">
      @for (item of navItems; track item.route) {
        <a class="adm-nav__item" [routerLink]="item.route" routerLinkActive="adm-nav__item--active" [title]="item.labelKey | t">
          <i [class]="'pi ' + item.icon"></i>
          <span class="adm-nav__label">{{ item.labelKey | t }}</span>
          @if (item.badge && notifs.unreadFor(item.badge) > 0) {
            <span class="adm-nav__badge">{{ notifs.unreadFor(item.badge) }}</span>
          }
        </a>
      }
    </nav>

    <div class="adm-sidebar__bottom">
      <div class="adm-user">
        <span class="adm-user__avatar">{{ auth.currentUser()?.avatar }}</span>
        <div class="adm-user__info">
          <span class="adm-user__name">{{ auth.currentUser()?.name }}</span>
          <span class="adm-user__role">{{ 'admin.role' | t }}</span>
        </div>
      </div>
      <button class="adm-logout" (click)="logout()" [title]="'dash.logout' | t">
        <i class="pi pi-sign-out"></i>
        <span class="adm-nav__label">{{ 'dash.logout' | t }}</span>
      </button>
    </div>
  </aside>

  <!-- MAIN -->
  <div class="adm-main">
    <header class="adm-topbar">
      <button class="adm-mobile-toggle" (click)="mobileOpen.set(!mobileOpen())" aria-label="Menü">
        <i class="pi pi-bars"></i>
      </button>
      <span class="adm-topbar__title">{{ 'admin.panelTitle' | t }}</span>
      <div class="adm-topbar__right">
        <app-lang-switcher />
        <app-notification-bell />
        <app-profile-menu
          [name]="auth.currentUser()?.name || ''"
          [avatar]="auth.currentUser()?.avatar || ''"
          profileLink="/admin/profile"
          (logout)="logout()"
        />
      </div>
    </header>
    <main class="adm-content">
      <router-outlet></router-outlet>
    </main>
  </div>

</div>

@if (mobileOpen()) {
  <div class="adm-overlay" (click)="mobileOpen.set(false)" aria-hidden="true"></div>
}
  `,
  styles: [`
    :host { display: contents; }
    * { box-sizing: border-box; }

    .adm-shell {
      display: flex; min-height: 100vh;
      background: #0a0c10; color: #fff; font-family: 'Inter', sans-serif;
    }

    /* ── Sidebar ── */
    .adm-sidebar {
      width: 240px; flex-shrink: 0;
      background: #0d0f18; border-right: 1px solid rgba(255,255,255,0.07);
      display: flex; flex-direction: column;
      position: sticky; top: 0; height: 100vh;
      transition: width 260ms cubic-bezier(0.4,0,0.2,1);
    }
    .adm-shell--collapsed .adm-sidebar { width: 64px; }
    .adm-shell--collapsed .adm-logo__text,
    .adm-shell--collapsed .adm-nav__label,
    .adm-shell--collapsed .adm-user__info,
    .adm-shell--collapsed .adm-logout span { opacity: 0; width: 0; overflow: hidden; white-space: nowrap; }

    .adm-sidebar__top {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.25rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.07); gap: 0.75rem;
    }
    .adm-logo { display: flex; align-items: center; justify-content: center; min-width: 0; flex: 1; overflow: hidden; pointer-events: none; }
    .adm-logo__img { height: 32px; width: auto; max-width: 100%; object-fit: contain; object-position: center; display: block; flex-shrink: 0; transition: height 200ms; }
    .adm-shell--collapsed .adm-logo__img { height: 28px; }
    .adm-logo__text { font-size: 0.78rem; font-weight: 700; color: #f59e0b; white-space: nowrap; letter-spacing: 0.06em; text-transform: uppercase; }
    .adm-collapse-btn {
      width: 28px; height: 28px; border-radius: 7px; border: none; cursor: pointer; flex-shrink: 0;
      background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4);
      display: flex; align-items: center; justify-content: center; font-size: 0.7rem;
      &:hover { background: rgba(255,255,255,0.1); color: #fff; }
    }

    .adm-nav {
      flex: 1; padding: 0.75rem 0.6rem; display: flex; flex-direction: column; gap: 2px; overflow-y: auto;
    }
    .adm-nav__item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.65rem 0.75rem; border-radius: 10px; text-decoration: none;
      color: rgba(255,255,255,0.5); font-size: 0.875rem; font-weight: 500;
      transition: all 160ms;
      i { font-size: 1rem; flex-shrink: 0; }
      &:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9); }
      &--active { background: rgba(245,158,11,0.12); color: #f59e0b; }
    }
    .adm-nav__badge {
      margin-left: auto; min-width: 18px; height: 18px; padding: 0 5px;
      border-radius: 9px; background: #e63946; color: #fff;
      font-size: 0.65rem; font-weight: 800; line-height: 18px; text-align: center; flex-shrink: 0;
    }
    .adm-shell--collapsed .adm-nav__badge { display: none; }

    .adm-sidebar__bottom {
      padding: 0.75rem 0.6rem; border-top: 1px solid rgba(255,255,255,0.07);
      display: flex; flex-direction: column; gap: 4px;
    }
    .adm-user {
      display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0.75rem; border-radius: 10px;
      &__avatar {
        width: 34px; height: 34px; border-radius: 50%;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #fff; font-size: 0.7rem; font-weight: 700; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        &--sm { width: 36px; height: 36px; }
      }
      &__info { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
      &__name { font-size: 0.8rem; font-weight: 600; color: #fff; white-space: nowrap; }
      &__role { font-size: 0.68rem; color: rgba(255,255,255,0.35); white-space: nowrap; }
    }
    .adm-logout {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.65rem 0.75rem; border-radius: 10px; border: none; cursor: pointer;
      background: transparent; color: rgba(255,255,255,0.4); font-size: 0.875rem; font-weight: 500; width: 100%;
      i { font-size: 1rem; flex-shrink: 0; }
      &:hover { background: rgba(239,68,68,0.1); color: #ef4444; }
    }

    /* ── Main ── */
    .adm-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .adm-topbar {
      height: 60px; background: #0d0f18; border-bottom: 1px solid rgba(255,255,255,0.07);
      display: flex; align-items: center; padding: 0 1.75rem; gap: 1rem; position: sticky; top: 0; z-index: 10;
    }
    .adm-mobile-toggle {
      display: none; border: none; background: transparent; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 1.1rem;
      @media (max-width: 768px) { display: flex; }
    }
    .adm-topbar__title { font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.5); }
    .adm-topbar__right { margin-left: auto; display: flex; align-items: center; gap: 0.75rem; }
    .adm-topbar__badge {
      display: flex; align-items: center; gap: 0.4rem;
      padding: 0.3rem 0.75rem; border-radius: 8px;
      background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2);
      color: #f59e0b; font-size: 0.72rem; font-weight: 700;
      i { font-size: 0.75rem; }
    }
    .adm-content { flex: 1; padding: 2rem 1.75rem; overflow-x: clip; }

    /* ── Mobile ── */
    .adm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 90; }
    @media (max-width: 768px) {
      .adm-sidebar {
        position: fixed; left: 0; top: 0; z-index: 100; height: 100vh;
        transform: translateX(-100%); transition: transform 260ms;
      }
    }
  `],
})
export class AdminLayout implements OnInit {
  protected readonly auth      = inject(AuthService);
  private  readonly router     = inject(Router);
  protected readonly notifs    = inject(NotificationsService);
  protected readonly collapsed  = signal(false);
  protected readonly mobileOpen = signal(false);

  protected readonly navItems: NavItem[] = [
    { labelKey: 'admin.nav.overview',      icon: 'pi-home',          route: '/admin/overview' },
    { labelKey: 'admin.nav.registrations', icon: 'pi-user-plus',     route: '/admin/registrations' },
    { labelKey: 'admin.nav.users',         icon: 'pi-users',         route: '/admin/users' },
    { labelKey: 'admin.nav.orders',        icon: 'pi-shopping-cart', route: '/admin/orders', badge: 'orders' },
    { labelKey: 'admin.nav.tickets',       icon: 'pi-comments',      route: '/admin/tickets', badge: 'tickets' },
  ];

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** İlgili sayfaya girince o kategorinin okunmamış bildirimleri temizlenir. */
  private readonly _clearOnVisit = effect(() => {
    const url = this.currentUrl();
    if (url.startsWith('/admin/orders') && this.notifs.unreadFor('orders') > 0) {
      void this.notifs.markAllRead('orders');
    } else if (url.startsWith('/admin/tickets') && this.notifs.unreadFor('tickets') > 0) {
      void this.notifs.markAllRead('tickets');
    }
  });

  ngOnInit(): void { this.notifs.start(); }

  logout(): void {
    this.notifs.stop();
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
