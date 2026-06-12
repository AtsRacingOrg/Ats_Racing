import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LangSwitcher } from '../../shared/ui/lang-switcher/lang-switcher';

interface NavItem {
  readonly key: string;
  readonly path: string;
}

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe, LangSwitcher],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})
export class SiteHeader {
  protected readonly nav: readonly NavItem[] = [
    { key: 'nav.home', path: '/' },
    { key: 'nav.about', path: '/about' },
    { key: 'nav.dealers', path: '/dealers' },
    { key: 'nav.contact', path: '/contact' },
  ];

  private readonly router = inject(Router);

  protected readonly scrolled = signal(false);
  protected readonly mobileOpen = signal(false);
  protected readonly cartCount = signal(0);

  /** Anasayfa dışındaki sayfalarda zemin açık → header her zaman katı (koyu) olmalı. */
  private readonly isHome = signal(this.router.url === '/' || this.router.url === '');
  protected readonly solid = computed(() => this.scrolled() || this.mobileOpen() || !this.isHome());

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(e => this.isHome.set(e.urlAfterRedirects === '/'));
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    this.scrolled.set(window.scrollY > 24);
  }

  protected toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }

  protected closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
