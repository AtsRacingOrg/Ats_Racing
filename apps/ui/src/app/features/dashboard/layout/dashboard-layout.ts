import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { PrivacyService } from '../../../core/privacy.service';
import { NotificationsService } from '../../../core/notifications/notifications.service';
import { AccountService } from '../../../core/account/account.service';
import { NotificationBell } from '../../../shared/notification-bell';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LangSwitcher } from '../../../shared/ui/lang-switcher/lang-switcher';

interface NavItem {
  labelKey: string;
  icon: string;
  route: string;
  /** Menü rozeti için bildirim kategorisi (orders / tickets). */
  badge?: string;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationBell, TranslatePipe, LangSwitcher],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dash-shell" [class.sidebar-collapsed]="collapsed()">

      <!-- SIDEBAR -->
      <aside class="dash-sidebar">
        <div class="dash-sidebar__top">
          <div class="dash-logo" aria-label="ATS Racing">
            <img src="/logo.png" alt="ATS Racing" class="dash-logo__img" />
          </div>
          <button class="dash-collapse-btn" (click)="collapsed.set(!collapsed())" aria-label="Menüyü daralt">
            <i class="pi" [class.pi-chevron-left]="!collapsed()" [class.pi-chevron-right]="collapsed()"></i>
          </button>
        </div>

        <nav class="dash-nav" aria-label="Dashboard menü">
          @for (item of navItems(); track item.route) {
            <a
              class="dash-nav__item"
              [routerLink]="item.route"
              routerLinkActive="dash-nav__item--active"
              [title]="item.labelKey | t"
            >
              <i [class]="'pi ' + item.icon"></i>
              <span class="dash-nav__label">{{ item.labelKey | t }}</span>
              @if (item.badge && notifs.unreadFor(item.badge) > 0) {
                <span class="dash-nav__badge">{{ notifs.unreadFor(item.badge) }}</span>
              }
            </a>
          }
        </nav>

        <div class="dash-sidebar__bottom">
          <div class="dash-user">
            <div class="dash-user__avatar">{{ initials() }}</div>
            <div class="dash-user__info">
              <span class="dash-user__name">{{ user()?.name || '—' }}</span>
              <span class="dash-user__email">{{ user()?.email }}</span>
            </div>
          </div>
          <a routerLink="/login" class="dash-logout">
            <i class="pi pi-sign-out"></i>
            <span class="dash-nav__label">{{ 'dash.logout' | t }}</span>
          </a>
        </div>
      </aside>

      <!-- MAIN -->
      <div class="dash-main">
        @if (accountLoaded() && !billingComplete()) {
          <a routerLink="/dashboard/profile" class="dash-billing-warn" title="Fatura bilgilerini tanımla">
            <div class="dash-billing-warn__track">
              @for (i of [0,1,2,3]; track i) {
                <span class="dash-billing-warn__msg">
                  <i class="pi pi-exclamation-triangle"></i>
                  {{ 'dash.billingWarn' | t }}
                </span>
              }
            </div>
          </a>
        }
        <header class="dash-topbar">
          <button class="dash-mobile-toggle" (click)="mobileOpen.set(!mobileOpen())" aria-label="Menü">
            <i class="pi pi-bars"></i>
          </button>
          <div class="dash-topbar__right">
            @if (showPrivacyToggle()) {
              <button class="dash-priv-toggle" type="button"
                      [class.dash-priv-toggle--on]="!pricesHidden()"
                      [attr.aria-pressed]="!pricesHidden()"
                      (click)="privacy.toggle()"
                      [title]="(pricesHidden() ? 'dash.privShow' : 'dash.privHide') | t">
                <i class="pi" [class.pi-eye-slash]="pricesHidden()" [class.pi-eye]="!pricesHidden()"></i>
                <span class="dash-priv-toggle__lbl">{{ (pricesHidden() ? 'dash.privOff' : 'dash.privOn') | t }}</span>
              </button>
            }
            <app-lang-switcher />
            <app-notification-bell />
            <div class="dash-user dash-user--sm">
              <div class="dash-user__avatar">{{ initials() }}</div>
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
      justify-content: center;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      pointer-events: none;
    }
    .dash-logo__img {
      height: 36px; width: auto; max-width: 100%;
      object-fit: contain; object-position: center;
      display: block;
      transition: height 200ms;
    }
    .dash-shell.sidebar-collapsed .dash-logo__img { height: 30px; }

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
    .dash-nav__badge {
      margin-left: auto; min-width: 18px; height: 18px; padding: 0 5px;
      border-radius: 9px; background: #e63946; color: #fff;
      font-size: 0.65rem; font-weight: 800; line-height: 18px; text-align: center; flex-shrink: 0;
    }
    .dash-shell.sidebar-collapsed .dash-nav__badge { display: none; }

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
      min-width: 0;
      display: flex;
      flex-direction: column;
      transition: margin-left 260ms cubic-bezier(0.4,0,0.2,1);
    }
    .dash-shell.sidebar-collapsed .dash-main { margin-left: 64px; }

    .dash-billing-warn {
      display: block; text-decoration: none; overflow: hidden; white-space: nowrap;
      background: linear-gradient(90deg, rgba(230,57,70,0.18), rgba(230,57,70,0.10));
      border-bottom: 1px solid rgba(230,57,70,0.3);
      position: sticky; top: 0; z-index: 60;
    }
    .dash-billing-warn__track { display: inline-flex; align-items: center; animation: billingMarquee 28s linear infinite; }
    .dash-billing-warn__msg {
      display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 2.5rem;
      font-size: 0.8rem; font-weight: 600; color: #ff8a93; white-space: nowrap;
      i { color: #e63946; }
    }
    .dash-billing-warn:hover .dash-billing-warn__track { animation-play-state: paused; }
    @keyframes billingMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
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
    .dash-topbar__right { display: flex; align-items: center; gap: 0.75rem; margin-left: auto; }
    .dash-topbar__icon-btn {
      position: relative;
      background: rgba(255,255,255,0.06); border: none; cursor: pointer;
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: rgba(255,255,255,0.6);
      transition: background 180ms, color 180ms;
    }
    .dash-topbar__icon-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .dash-priv-toggle {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 0.9rem; border-radius: 999px; cursor: pointer;
      background: rgba(230,57,70,0.12); border: 1px solid rgba(230,57,70,0.35);
      color: #ff8a93; font-size: 0.78rem; font-weight: 600; white-space: nowrap;
      transition: all 160ms;
    }
    .dash-priv-toggle i { font-size: 0.9rem; }
    .dash-priv-toggle:hover { background: rgba(230,57,70,0.18); }
    .dash-priv-toggle--on {
      background: rgba(74,222,128,0.12); border-color: rgba(74,222,128,0.35); color: #4ade80;
    }
    .dash-priv-toggle--on:hover { background: rgba(74,222,128,0.18); }
    @media (max-width: 640px) {
      .dash-priv-toggle__lbl { display: none; }
      .dash-priv-toggle { padding: 0.5rem; }
    }
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

    .dash-content { flex: 1; padding: 2rem 1.75rem; overflow-x: clip; }

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
export class DashboardLayout implements OnInit {
  private  readonly auth    = inject(AuthService);
  private  readonly router  = inject(Router);
  protected readonly privacy = inject(PrivacyService);
  protected readonly notifs = inject(NotificationsService);
  private  readonly accountSvc = inject(AccountService);
  protected readonly collapsed = signal(false);
  protected readonly mobileOpen = signal(false);

  protected readonly accountLoaded = this.accountSvc.loaded;
  protected readonly billingComplete = this.accountSvc.billingComplete;

  ngOnInit(): void {
    this.notifs.start();
    void this.accountSvc.load();
  }

  protected readonly pricesHidden = this.privacy.pricesHidden;
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );
  protected readonly showPrivacyToggle = computed(() =>
    this.auth.isDealer() && this.currentUrl().startsWith('/dashboard/tools'),
  );

  /** İlgili sayfaya girince o kategorinin okunmamış bildirimleri temizlenir. */
  private readonly _clearOnVisit = effect(() => {
    const url = this.currentUrl();
    if (url.startsWith('/dashboard/orders') && this.notifs.unreadFor('orders') > 0) {
      void this.notifs.markAllRead('orders');
    } else if (url.startsWith('/dashboard/support') && this.notifs.unreadFor('tickets') > 0) {
      void this.notifs.markAllRead('tickets');
    }
  });

  protected readonly user = this.auth.currentUser;
  protected get userName(): string { return this.auth.currentUser()?.name ?? 'Kullanıcı'; }
  protected get userAvatar(): string { return this.auth.currentUser()?.avatar ?? 'AY'; }

  /** Kullanıcı adından baş harfler (ör. "Ali Yıldız" → "AY"). */
  protected initials(): string {
    const name = this.auth.currentUser()?.name?.trim();
    if (!name) { return '?'; }
    return name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  logout(): void { this.notifs.stop(); this.accountSvc.clear(); this.auth.logout(); this.router.navigate(['/login']); }

  /** Menü öğeleri — "Ödeme Borçlarım" yalnızca bayilere gösterilir. */
  protected readonly navItems = computed<NavItem[]>(() => {
    const items: NavItem[] = [
      { labelKey: 'dash.nav.overview', icon: 'pi-home',          route: '/dashboard/overview' },
      { labelKey: 'dash.nav.orders',   icon: 'pi-shopping-cart', route: '/dashboard/orders', badge: 'orders' },
      { labelKey: 'dash.nav.tools',    icon: 'pi-sliders-h',     route: '/dashboard/tools'  },
    ];
    if (this.auth.isDealer()) {
      items.push({ labelKey: 'dash.nav.payments', icon: 'pi-wallet', route: '/dashboard/payments' });
    }
    items.push({ labelKey: 'dash.nav.support', icon: 'pi-headphones', route: '/dashboard/support', badge: 'tickets' });
    items.push({ labelKey: 'dash.nav.profile', icon: 'pi-user', route: '/dashboard/profile' });
    return items;
  });
}
