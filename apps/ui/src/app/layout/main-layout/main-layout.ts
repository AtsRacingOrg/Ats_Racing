import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteFooter } from '../site-footer/site-footer';
import { SiteHeader } from '../site-header/site-header';
import { SiteRail } from '../site-rail/site-rail';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SiteHeader, SiteFooter, SiteRail],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-site-header></app-site-header>
    <app-site-rail></app-site-rail>
    <main id="main" class="main-content">
      <router-outlet></router-outlet>
    </main>
    <app-site-footer></app-site-footer>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100dvh;
      }

      .main-content {
        flex: 1;
      }
    `,
  ],
})
export class MainLayout {}
