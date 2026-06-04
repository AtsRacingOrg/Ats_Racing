import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';

/** Kompakt TR | EN dil değiştirici. */
@Component({
  selector: 'app-lang-switcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lang" role="group" aria-label="Dil / Language">
      <button type="button" class="lang__btn" [class.lang__btn--active]="i18n.lang() === 'tr'"
              (click)="i18n.set('tr')" aria-label="Türkçe">TR</button>
      <span class="lang__sep" aria-hidden="true">|</span>
      <button type="button" class="lang__btn" [class.lang__btn--active]="i18n.lang() === 'en'"
              (click)="i18n.set('en')" aria-label="English">EN</button>
    </div>
  `,
  styles: [`
    .lang { display: inline-flex; align-items: center; gap: 2px; font-weight: 700; font-size: 0.72rem; letter-spacing: 0.04em; user-select: none; }
    .lang__btn {
      background: transparent; border: none; cursor: pointer; padding: 3px 5px; border-radius: 6px;
      color: rgba(255,255,255,0.45); font: inherit; transition: color 140ms, background 140ms;
      &:hover { color: rgba(255,255,255,0.85); }
      &--active { color: #fff; background: rgba(230,57,70,0.85); }
    }
    .lang__sep { color: rgba(255,255,255,0.25); }
  `],
})
export class LangSwitcher {
  protected readonly i18n = inject(I18nService);
}
