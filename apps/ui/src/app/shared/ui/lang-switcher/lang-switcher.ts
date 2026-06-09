import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { I18nService, Lang } from '../../../core/i18n/i18n.service';

interface LangOption { code: Lang; flag: string; label: string; }

/** Bayraklı açılır dil değiştirici (TR / EN / DE). */
@Component({
  selector: 'app-lang-switcher',
  standalone: true,
  imports: [UpperCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lang" [class.lang--open]="open()">
      <button type="button" class="lang__trigger" (click)="toggle()"
              [attr.aria-expanded]="open()" aria-haspopup="listbox" aria-label="Dil / Language">
        <span class="lang__flag">{{ current().flag }}</span>
        <span class="lang__code">{{ current().code | uppercase }}</span>
        <i class="pi pi-chevron-down lang__chev" aria-hidden="true"></i>
      </button>

      @if (open()) {
        <ul class="lang__menu" role="listbox">
          @for (o of options; track o.code) {
            <li>
              <button type="button" class="lang__opt" role="option"
                      [attr.aria-selected]="i18n.lang() === o.code"
                      [class.lang__opt--active]="i18n.lang() === o.code"
                      (click)="choose(o.code)">
                <span class="lang__flag">{{ o.flag }}</span>
                <span class="lang__label">{{ o.label }}</span>
                @if (i18n.lang() === o.code) {
                  <i class="pi pi-check lang__check" aria-hidden="true"></i>
                }
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .lang { position: relative; display: inline-block; user-select: none; }

    .lang__trigger {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; cursor: pointer; padding: 5px 9px;
      color: rgba(255,255,255,0.85); font: inherit; font-weight: 700;
      font-size: 0.72rem; letter-spacing: 0.04em;
      transition: background 140ms, border-color 140ms;
      &:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.2); }
    }
    .lang--open .lang__trigger { border-color: rgba(230,57,70,0.55); background: rgba(255,255,255,0.09); }

    .lang__flag { font-size: 1rem; line-height: 1; }
    .lang__code { color: #fff; }
    .lang__chev { font-size: 0.6rem; color: rgba(255,255,255,0.5); transition: transform 160ms; }
    .lang--open .lang__chev { transform: rotate(180deg); }

    .lang__menu {
      position: absolute; top: calc(100% + 6px); right: 0; z-index: 60;
      min-width: 148px; margin: 0; padding: 5px; list-style: none;
      background: #15141a; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; box-shadow: 0 16px 40px -12px rgba(0,0,0,0.7);
      animation: langPop 140ms ease both;
    }
    @keyframes langPop { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

    .lang__opt {
      display: flex; align-items: center; gap: 9px; width: 100%;
      background: transparent; border: none; cursor: pointer;
      padding: 8px 10px; border-radius: 7px; text-align: left;
      color: rgba(255,255,255,0.7); font: inherit; font-size: 0.8rem; font-weight: 600;
      transition: background 140ms, color 140ms;
      &:hover { background: rgba(255,255,255,0.06); color: #fff; }
      &--active { color: #fff; }
    }
    .lang__label { flex: 1; }
    .lang__check { font-size: 0.7rem; color: #e63946; }
  `],
})
export class LangSwitcher {
  protected readonly i18n = inject(I18nService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly options: LangOption[] = [
    { code: 'tr', flag: '🇹🇷', label: 'Türkçe' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  ];

  protected readonly open = signal(false);
  protected readonly current = computed(
    () => this.options.find(o => o.code === this.i18n.lang()) ?? this.options[0],
  );

  protected toggle(): void { this.open.update(v => !v); }

  protected choose(code: Lang): void {
    this.i18n.set(code);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onOutside(ev: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(ev.target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.open.set(false); }
}
