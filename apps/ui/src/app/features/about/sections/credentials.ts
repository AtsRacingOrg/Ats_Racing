import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EvcBadge } from '../../../shared/ui/evc-badge/evc-badge';

@Component({
  selector: 'app-about-credentials',
  standalone: true,
  imports: [EvcBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cred">
      <div class="cred__inner">
        <div class="cred__copy">
          <p class="cred__eyebrow">Lisanslar &amp; Yetkiler</p>
          <h2 class="cred__title">Resmi yetkili. Belgeli. İzlenebilir.</h2>
          <p class="cred__lead">
            ECU tuning tarafında <strong>EVC GmbH</strong> tarafından lisanslı bayiyiz.
            Her yazılım kendi lisansımızla yüklenir, müşteriye lisans doğrulama linki
            verilir — yaptığımız iş şeffaftır ve geri izlenebilir.
          </p>
          <a
            class="cred__verify"
            href="https://www.evc.de/de/check_evc_license.asp?k=1PGrFKLZqc2zbwGPtgp9cQ%3d%3d"
            target="_blank"
            rel="noopener"
          >
            <i class="pi pi-shield"></i>
            <span>Lisansı doğrula</span>
            <i class="pi pi-arrow-up-right"></i>
          </a>
        </div>

        <div class="cred__badges">
          <app-evc-badge theme="light"></app-evc-badge>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .cred {
        background: #f4f4f4;
        padding-block: 4.5rem;
      }
      .cred__inner {
        max-width: 1600px;
        margin-inline: auto;
        padding-inline: 1.5rem;
        display: grid;
        gap: 2.5rem;
        align-items: center;
      }
      @media (min-width: 768px) { .cred__inner { padding-inline: 3rem; } }
      @media (min-width: 1024px) {
        .cred__inner { grid-template-columns: 1.6fr 1fr; gap: 4rem; }
      }
      @media (min-width: 1280px) { .cred__inner { padding-inline: 70px; } }

      .cred__eyebrow {
        font-family: 'DM Sans', sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.22em;
        font-size: 0.75rem;
        font-weight: 600;
        color: #ea0a0b;
        margin: 0 0 0.75rem;
      }

      .cred__title {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 700;
        text-transform: uppercase;
        font-size: clamp(1.875rem, 3.5vw, 2.75rem);
        line-height: 1.05;
        color: #18171a;
        margin: 0 0 1rem;
      }

      .cred__lead {
        margin: 0 0 1.5rem;
        color: #615f5c;
        line-height: 1.65;
        max-width: 38rem;

        strong { color: #18171a; }
      }

      .cred__verify {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.1rem;
        background: #18171a;
        color: #ffffff;
        font-family: 'DM Sans', sans-serif;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 0.8125rem;
        text-decoration: none;
        transition: background-color 200ms ease;

        &:hover { background: #ea0a0b; }
      }

      .cred__badges {
        display: flex;
        justify-content: flex-start;

        @media (min-width: 1024px) {
          justify-content: flex-end;
        }
      }
    `,
  ],
})
export class AboutCredentials {}
