import {
  ChangeDetectionStrategy, Component, ElementRef, EventEmitter,
  HostListener, Input, Output, inject, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

/** Avatar + açılır menü: Profilim / Çıkış Yap. */
@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pm" [class.pm--open]="open()">
      <button type="button" class="pm__avatar" (click)="toggle()"
              [attr.aria-expanded]="open()" aria-haspopup="menu"
              [attr.aria-label]="'common.account' | t">
        {{ avatar || '?' }}
      </button>

      @if (open()) {
        <div class="pm__menu" role="menu">
          @if (name) { <div class="pm__head">{{ name }}</div> }
          <a class="pm__item" role="menuitem" [routerLink]="profileLink" (click)="close()">
            <i class="pi pi-user"></i> {{ 'dash.nav.profile' | t }}
          </a>
          <button type="button" class="pm__item pm__item--danger" role="menuitem" (click)="onLogout()">
            <i class="pi pi-sign-out"></i> {{ 'dash.logout' | t }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .pm { position: relative; }
    .pm__avatar {
      width: 38px; height: 38px; border-radius: 50%; cursor: pointer;
      display: grid; place-items: center; border: none;
      font-weight: 700; font-size: 0.8rem; color: #fff;
      background: linear-gradient(135deg, #e63946, #b3121f);
      transition: transform 140ms, box-shadow 140ms;
      &:hover { transform: translateY(-1px); box-shadow: 0 6px 16px -6px rgba(230,57,70,0.7); }
    }
    .pm--open .pm__avatar { box-shadow: 0 0 0 3px rgba(230,57,70,0.35); }

    .pm__menu {
      position: absolute; top: calc(100% + 8px); right: 0; z-index: 80;
      min-width: 190px; padding: 6px;
      background: #15141a; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px; box-shadow: 0 18px 44px -14px rgba(0,0,0,0.7);
      animation: pmPop 140ms ease both;
    }
    @keyframes pmPop { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

    .pm__head {
      padding: 8px 12px 10px; margin-bottom: 4px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      font-weight: 700; font-size: 0.85rem; color: #fff;
    }
    .pm__item {
      display: flex; align-items: center; gap: 10px; width: 100%;
      padding: 9px 12px; border-radius: 8px; cursor: pointer;
      background: transparent; border: none; text-align: left;
      font: inherit; font-size: 0.85rem; color: rgba(255,255,255,0.8); text-decoration: none;
      transition: background 140ms, color 140ms;
      i { font-size: 0.85rem; width: 16px; }
      &:hover { background: rgba(255,255,255,0.06); color: #fff; }
      &--danger:hover { background: rgba(230,57,70,0.14); color: #ff6b6b; }
    }
  `],
})
export class ProfileMenu {
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input() name = '';
  @Input() avatar = '';
  @Input() profileLink = '/dashboard/profile';
  @Output() logout = new EventEmitter<void>();

  protected readonly open = signal(false);
  protected toggle(): void { this.open.update(v => !v); }
  protected close(): void { this.open.set(false); }
  protected onLogout(): void { this.open.set(false); this.logout.emit(); }

  @HostListener('document:click', ['$event'])
  onOutside(ev: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(ev.target)) { this.open.set(false); }
  }
  @HostListener('document:keydown.escape')
  onEsc(): void { this.open.set(false); }
}
