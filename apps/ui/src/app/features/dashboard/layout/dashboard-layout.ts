import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dash-shell" [class.sidebar-collapsed]="collapsed()">

      <!-- SIDEBAR -->
      <aside class="dash-sidebar">
        <div class="dash-sidebar__top">
          <a routerLink="/" class="dash-logo">
            <span class="dash-logo__icon">ATS</span>
            <span class="dash-logo__text">Racing</span>
          </a>
          <button class="dash-collapse-btn" (click)="collapsed.set(!collapsed())" aria-label="Menüyü daralt">
            <i class="pi" [class.pi-chevron-left]="!collapsed()" [class.pi-chevron-right]="collapsed()"></i>
          </button>
        </div>

        <nav class="dash-nav" aria-label="Dashboard menü">
          @for (item of navItems; track item.route) {
            <a
              class="dash-nav__item"
              [routerLink]="item.route"
              routerLinkActive="dash-nav__item--active"
              [title]="item.label"
            >
              <i [class]="'pi ' + item.icon"></i>
              <span class="dash-nav__label">{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="dash-sidebar__bottom">
          <div class="dash-user">
            <div class="dash-user__avatar">AY</div>
            <div class="dash-user__info">
              <span class="dash-user__name">Ahmet Yıldız</span>
              <span class="dash-user__email">ahmet&#64;mail.com</span>
            </div>
          </div>
          <a routerLink="/login" class="dash-logout">
            <i class="pi pi-sign-out"></i>
            <span class="dash-nav__label">Çıkış Yap</span>
          </a>
        </div>
      </aside>

      <!-- MAIN -->
      <div class="dash-main">
        <header class="dash-topbar">
          <button class="dash-mobile-toggle" (click)="mobileOpen.set(!mobileOpen())" aria-label="Menü">
            <i class="pi pi-bars"></i>
          </button>
          <div class="dash-topbar__right">
            <button class="dash-topbar__icon-btn" aria-label="Bildirimler">
              <i class="pi pi-bell"></i>
              <span class="dash-badge">3</span>
            </button>
            <div class="dash-user dash-user--sm">
              <div class="dash-user__avatar">AY</div>
            </div>
          </div>
        </header>

        <main class="dash-content">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Mobile overlay -->
      @if (mobileOpen()) {
        <button
          class="dash-overlay"
          (click)="mobileOpen.set(false)"
          aria-label="Menüyü kapat"
          type="button"
        ></button>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .dash-shell {
      display: flex;
      min-height: 100vh;
      background: #0d0f14;
      position: relative;
    }

    /* ── SIDEBAR ── */
    .dash-sidebar {
      width: 240px;
      min-height: 100vh;
      background: #13151c;
      border-right: 1px solid rgba(255,255,255,0.06);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0; left: 0; bottom: 0;
      z-index: 100;
      transition: width 260ms cubic-bezier(0.4,0,0.2,1), transform 260ms ease;
    }
    .dash-shell.sidebar-collapsed .dash-sidebar { width: 64px; }
    .dash-shell.sidebar-collapsed .dash-logo__text,
    .dash-shell.sidebar-collapsed .dash-nav__label,
    .dash-shell.sidebar-collapsed .dash-user__info,
    .dash-shell.sidebar-collapsed .dash-user__name,
    .dash-shell.sidebar-collapsed .dash-user__email { opacity: 0; width: 0; overflow: hidden; white-space: nowrap; }

    .dash-sidebar__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      min-height: 64px;
    }

    .dash-logo {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      text-decoration: none;
      flex: 1;
      min-width: 0;
    }
    .dash-logo__icon {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #e63946, #c1121f);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.65rem; font-weight: 800; color: #fff;
      letter-spacing: 0.04em;
      flex-shrink: 0;
    }
    .dash-logo__text {
      font-size: 1rem; font-weight: 700; color: #fff;
      letter-spacing: 0.02em;
      transition: opacity 200ms, width 200ms;
    }

    .dash-collapse-btn {
      background: transparent; border: none; cursor: pointer;
      color: rgba(255,255,255,0.4); padding: 0.25rem;
      border-radius: 6px; transition: color 200ms, background 200ms;
      flex-shrink: 0;
    }
    .dash-collapse-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }

    /* ── NAV ── */
    .dash-nav {
      flex: 1;
      padding: 1rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }
    .dash-nav__item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0.875rem;
      border-radius: 10px;
      color: rgba(255,255,255,0.5);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background 180ms, color 180ms;
      white-space: nowrap;
    }
    .dash-nav__item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9); }
    .dash-nav__item--active {
      background: rgba(230,57,70,0.15) !important;
      color: #e63946 !important;
    }
    .dash-nav__item i { font-size: 1.1rem; flex-shrink: 0; }
    .dash-nav__label { transition: opacity 200ms, width 200ms; }

    /* ── SIDEBAR BOTTOM ── */
    .dash-sidebar__bottom {
      padding: 0.75rem;
      border-top: 1px solid rgba(255,255,255,0.06);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .dash-user {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.625rem 0.625rem;
      border-radius: 10px;
    }
    .dash-user--sm { padding: 0; }
    .dash-user__avatar {
      width: 34px; height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #e63946, #c1121f);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; font-weight: 700; color: #fff;
      flex-shrink: 0;
    }
    .dash-user__info { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
    .dash-user__name { font-size: 0.8rem; font-weight: 600; color: #fff; white-space: nowrap; }
    .dash-user__email { font-size: 0.7rem; color: rgba(255,255,255,0.4); white-space: nowrap; }

    .dash-logout {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.625rem 0.875rem;
      border-radius: 10px;
      color: rgba(255,100,100,0.7);
      text-decoration: none;
      font-size: 0.875rem; font-weight: 500;
      transition: background 180ms, color 180ms;
      white-space: nowrap;
    }
    .dash-logout:hover { background: rgba(230,57,70,0.12); color: #e63946; }
    .dash-logout i { font-size: 1rem; flex-shrink: 0; }

    /* ── MAIN ── */
    .dash-main {
      flex: 1;
      margin-left: 240px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      transition: margin-left 260ms cubic-bezier(0.4,0,0.2,1);
    }
    .dash-shell.sidebar-collapsed .dash-main { margin-left: 64px; }

    .dash-topbar {
      height: 64px;
      background: #13151c;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      position: sticky; top: 0;
      z-index: 50;
    }
    .dash-topbar__right { display: flex; align-items: center; gap: 0.75rem; }
    .dash-topbar__icon-btn {
      position: relative;
      background: rgba(255,255,255,0.06); border: none; cursor: pointer;
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: rgba(255,255,255,0.6);
      transition: background 180ms, color 180ms;
    }
    .dash-topbar__icon-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .dash-badge {
      position: absolute; top: -4px; right: -4px;
      background: #e63946; color: #fff;
      font-size: 0.55rem; font-weight: 700;
      width: 16px; height: 16px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
    }
    .dash-mobile-toggle {
      display: none;
      background: transparent; border: none; cursor: pointer;
      color: rgba(255,255,255,0.7); font-size: 1.2rem;
      padding: 0.25rem;
    }

    .dash-content { flex: 1; padding: 2rem 1.75rem; overflow-x: hidden; }

    /* ── MOBILE ── */
    .dash-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      z-index: 90;
    }
    @media (max-width: 768px) {
      .dash-sidebar { transform: translateX(-100%); width: 240px !important; }
      .dash-shell.sidebar-collapsed .dash-sidebar { transform: translateX(-100%); }
      .dash-main { margin-left: 0 !important; }
      .dash-mobile-toggle { display: flex; align-items: center; }
    }
  `],
})
export class DashboardLayout {
  protected readonly collapsed = signal(false);
  protected readonly mobileOpen = signal(false);

  protected readonly navItems: NavItem[] = [
    { label: 'Genel Bakış', icon: 'pi-home', route: '/dashboard/overview' },
    { label: 'Dosyalarım', icon: 'pi-folder-open', route: '/dashboard/files' },
    { label: 'Araçlar', icon: 'pi-sliders-h', route: '/dashboard/tools' },
  ];
}
