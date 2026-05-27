import { ChangeDetectionStrategy, Component, input } from '@angular/core';

const EVC_TOKEN = '1PGrFKLZqc2zbwGPtgp9cQ%3d%3d';

@Component({
  selector: 'app-evc-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      class="evc"
      [class.evc--dark]="theme() === 'dark'"
      [class.evc--light]="theme() === 'light'"
      [href]="'https://www.evc.de/de/check_evc_license.asp?k=' + token"
      target="_blank"
      rel="noopener"
      aria-label="EVC lisans doğrulama sayfasını aç"
    >
      <span class="evc__icon" aria-hidden="true"><i class="pi pi-verified"></i></span>
      <span class="evc__text">
        <span class="evc__lbl">Yetkili Bayi</span>
        <span class="evc__sub">EVC Lisanslı ECU Tuning Partneri</span>
      </span>
      <img
        class="evc__seal"
        [src]="'https://www.evc.de/common/check_evc_license_image.asp?k=' + token"
        alt="EVC lisans mührü"
        loading="lazy"
        decoding="async"
      />
    </a>
  `,
  styles: [
    `
      .evc {
        display: inline-flex;
        align-items: center;
        gap: 0.85rem;
        padding: 0.85rem 1rem;
        text-decoration: none;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.04);
        color: #ffffff;
        max-width: 100%;
        transition: background-color 200ms ease, border-color 200ms ease, transform 200ms ease;
      }
      .evc:hover {
        background: rgba(234, 10, 11, 0.12);
        border-color: #ea0a0b;
        transform: translateY(-1px);
      }
      .evc:focus-visible {
        outline: 2px solid #ea0a0b;
        outline-offset: 3px;
      }

      .evc--light {
        background: #ffffff;
        border-color: #ececec;
        color: #18171a;
      }
      .evc--light:hover {
        background: rgba(234, 10, 11, 0.08);
        border-color: #ea0a0b;
      }

      .evc__icon {
        display: inline-grid;
        place-items: center;
        width: 36px;
        height: 36px;
        background: #ea0a0b;
        color: #ffffff;
        font-size: 1rem;
        flex-shrink: 0;
      }

      .evc__text {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        min-width: 0;
      }

      .evc__lbl {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        font-size: 0.9375rem;
        line-height: 1;
      }

      .evc__sub {
        font-family: 'DM Sans', sans-serif;
        font-size: 0.6875rem;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-weight: 500;
        opacity: 0.7;
      }

      .evc__seal {
        height: 36px;
        width: auto;
        max-width: 130px;
        object-fit: contain;
        background: #ffffff;
        padding: 2px 4px;
        flex-shrink: 0;
        margin-left: 0.25rem;
      }

      @media (max-width: 480px) {
        .evc__sub { display: none; }
      }
    `,
  ],
})
export class EvcBadge {
  readonly theme = input<'dark' | 'light'>('dark');
  protected readonly token = EVC_TOKEN;
}
