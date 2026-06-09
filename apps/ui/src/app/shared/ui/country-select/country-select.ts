import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  forwardRef,
  inject,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { COUNTRIES, Country, flagOf } from '../../data/countries';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

/** Bayraklı, aranabilir ülke seçici. ReactiveForms ile uyumlu (CVA). */
@Component({
  selector: 'app-country-select',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CountrySelect),
      multi: true,
    },
  ],
  template: `
    <div class="cs" [class.cs--open]="open()">
      <button type="button" class="cs__trigger" [class.cs--disabled]="disabled()"
              (click)="toggle()" [disabled]="disabled()"
              [attr.aria-expanded]="open()" aria-haspopup="listbox">
        @if (selected(); as s) {
          <span class="cs__flag">{{ flag(s.code) }}</span>
          <span class="cs__name">{{ name(s) }}</span>
        } @else {
          <span class="cs__placeholder">{{ 'auth.countryPlaceholder' | t }}</span>
        }
        <i class="pi pi-chevron-down cs__chev" aria-hidden="true"></i>
      </button>

      @if (open()) {
        <div class="cs__menu">
          <div class="cs__search">
            <i class="pi pi-search" aria-hidden="true"></i>
            <input #searchBox type="text" [value]="query()" (input)="onSearch($event)"
                   [attr.placeholder]="'common.search' | t" autocomplete="off" />
          </div>
          <ul class="cs__list" role="listbox">
            @for (c of filtered(); track c.code) {
              <li>
                <button type="button" class="cs__opt" role="option"
                        [class.cs__opt--active]="c.code === value()"
                        [attr.aria-selected]="c.code === value()"
                        (click)="choose(c.code)">
                  <span class="cs__flag">{{ flag(c.code) }}</span>
                  <span class="cs__name">{{ name(c) }}</span>
                  <span class="cs__code">{{ c.code }}</span>
                </button>
              </li>
            }
            @if (filtered().length === 0) {
              <li class="cs__empty">{{ 'common.all' | t }} —</li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [`
    .cs { position: relative; width: 100%; }

    .cs__trigger {
      display: flex; align-items: center; gap: 9px; width: 100%;
      background: #fff; border: 1px solid #d8dce3; border-radius: 8px;
      padding: 0.65rem 0.85rem; cursor: pointer; font: inherit;
      color: #1c2430; transition: border-color 140ms, box-shadow 140ms;
      &:hover:not(.cs--disabled) { border-color: #b9c0cb; }
      &.cs--disabled { opacity: 0.6; cursor: not-allowed; }
    }
    .cs--open .cs__trigger { border-color: #e63946; box-shadow: 0 0 0 3px rgba(230,57,70,0.12); }

    .cs__flag { font-size: 1.15rem; line-height: 1; }
    .cs__name { flex: 1; text-align: left; font-size: 0.9rem; }
    .cs__placeholder { flex: 1; text-align: left; color: #97a0ad; font-size: 0.9rem; }
    .cs__chev { font-size: 0.65rem; color: #97a0ad; transition: transform 160ms; }
    .cs--open .cs__chev { transform: rotate(180deg); }

    .cs__menu {
      position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 70;
      background: #fff; border: 1px solid #e2e6ec; border-radius: 10px;
      box-shadow: 0 18px 44px -14px rgba(20,28,40,0.28);
      overflow: hidden; animation: csPop 140ms ease both;
    }
    @keyframes csPop { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

    .cs__search {
      display: flex; align-items: center; gap: 8px; padding: 0.6rem 0.75rem;
      border-bottom: 1px solid #eef1f5;
      i { color: #97a0ad; font-size: 0.8rem; }
      input { flex: 1; border: none; outline: none; font: inherit; font-size: 0.88rem; color: #1c2430; background: transparent; }
    }

    .cs__list { list-style: none; margin: 0; padding: 5px; max-height: 260px; overflow-y: auto; }
    .cs__opt {
      display: flex; align-items: center; gap: 9px; width: 100%;
      background: transparent; border: none; cursor: pointer; text-align: left;
      padding: 8px 10px; border-radius: 7px; font: inherit; font-size: 0.88rem; color: #2a3340;
      transition: background 120ms;
      &:hover { background: #f3f5f8; }
      &--active { background: rgba(230,57,70,0.08); color: #c1121f; font-weight: 600; }
    }
    .cs__opt .cs__name { flex: 1; }
    .cs__code { font-size: 0.7rem; font-weight: 700; color: #97a0ad; letter-spacing: 0.04em; }
    .cs__empty { padding: 0.75rem 1rem; color: #97a0ad; font-size: 0.85rem; }
  `],
})
export class CountrySelect implements ControlValueAccessor {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly i18n = inject(I18nService);

  protected readonly value = signal<string>('');
  protected readonly open = signal(false);
  protected readonly disabled = signal(false);
  protected readonly query = signal('');

  protected readonly countries = COUNTRIES;

  protected readonly selected = computed(
    () => this.countries.find(c => c.code === this.value()) ?? null,
  );

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLocaleLowerCase('tr');
    const lang = this.i18n.lang();
    const list = q
      ? this.countries.filter(c =>
          this.name(c).toLocaleLowerCase('tr').includes(q) ||
          c.code.toLowerCase().includes(q))
      : this.countries;
    // Seçili dile göre alfabetik (Türkiye'yi yine de üstte tut).
    return [...list].sort((a, b) => {
      if (a.code === 'TR') { return -1; }
      if (b.code === 'TR') { return 1; }
      return this.name(a).localeCompare(this.name(b), lang === 'tr' ? 'tr' : 'en');
    });
  });

  protected flag(code: string): string { return flagOf(code); }
  protected name(c: Country): string { return this.i18n.lang() === 'tr' ? c.tr : c.en; }

  protected toggle(): void {
    if (this.disabled()) { return; }
    this.open.update(v => !v);
    if (this.open()) { this.query.set(''); }
  }

  protected onSearch(ev: Event): void {
    this.query.set((ev.target as HTMLInputElement).value);
  }

  protected choose(code: string): void {
    this.value.set(code);
    this.onChange(code);
    this.onTouched();
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onOutside(ev: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(ev.target)) {
      this.open.set(false);
      this.onTouched();
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.open.set(false); }

  /* ── ControlValueAccessor ── */
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: string | null): void { this.value.set(v ?? ''); }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }
}
