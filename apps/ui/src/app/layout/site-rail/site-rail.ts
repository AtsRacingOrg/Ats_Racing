import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface RailItem {
  readonly icon: string;
  readonly label: string;
  readonly path: string;
}

@Component({
  selector: 'app-site-rail',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="rail" aria-label="Hızlı erişim">
      <ul role="list">
        @for (item of items; track item.path) {
          <li>
            <a [routerLink]="item.path" [attr.aria-label]="item.label">
              <i [class]="item.icon" aria-hidden="true"></i>
            </a>
          </li>
        }
      </ul>
    </aside>
  `,
  styles: [
    `
      .rail {
        position: fixed;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        z-index: 40;
        display: none;
      }
      @media (min-width: 1024px) {
        .rail { display: block; }
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      a {
        display: inline-grid;
        place-items: center;
        width: 56px;
        height: 56px;
        background: #ea0a0b;
        color: #ffffff;
        font-size: 1.125rem;
        text-decoration: none;
        transition: background-color 200ms ease, transform 200ms ease;
      }
      a:hover {
        background: #ff2020;
        transform: translateX(-3px);
      }
      a:focus-visible {
        outline: 2px solid #ffffff;
        outline-offset: -4px;
      }
    `,
  ],
})
export class SiteRail {
  protected readonly items: readonly RailItem[] = [
    { icon: 'pi pi-shopping-cart', label: 'Sepet',     path: '/shop' },
    { icon: 'pi pi-images',        label: 'Portfolyo', path: '/' },
    { icon: 'pi pi-window-maximize', label: 'Login',  path: '/login' },
  ];
}
