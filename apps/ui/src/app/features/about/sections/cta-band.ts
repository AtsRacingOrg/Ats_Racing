import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-about-cta',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cta">
      <div class="cta__bg" aria-hidden="true"></div>
      <div class="cta__overlay" aria-hidden="true"></div>
      <div class="container-page cta__inner">
        <div>
          <p class="cta__eyebrow">Birlikte çalışalım</p>
          <h2 class="cta__title">Aracın için doğru ekibi arıyorsan, başlangıç burada.</h2>
        </div>
        <div class="cta__actions">
          <p-button label="Teklif Al" routerLink="/contact"></p-button>
          <p-button label="Anasayfa" styleClass="p-button-outlined" routerLink="/"></p-button>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .cta {
        position: relative;
        color: #ffffff;
        isolation: isolate;
        padding-block: 5rem;
      }
      .cta__bg {
        position: absolute;
        inset: 0;
        background-image: url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2400&q=80');
        background-size: cover;
        background-position: center;
        z-index: -2;
      }
      .cta__overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(120deg, rgba(13, 12, 15, 0.95), rgba(13, 12, 15, 0.7));
        z-index: -1;
      }
      .cta__inner {
        display: grid;
        gap: 2rem;
        align-items: center;
      }
      @media (min-width: 1024px) {
        .cta__inner {
          grid-template-columns: 1.4fr 1fr;
          gap: 4rem;
        }
      }
      .cta__eyebrow {
        font-family: 'DM Sans', sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.24em;
        font-size: 0.8125rem;
        font-weight: 600;
        color: #ea0a0b;
        margin: 0 0 0.75rem;
      }
      .cta__title {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 600;
        text-transform: uppercase;
        font-size: clamp(1.75rem, 3.5vw, 2.5rem);
        line-height: 1.05;
        color: #ffffff;
        margin: 0;
      }
      .cta__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        @media (min-width: 1024px) {
          justify-content: flex-end;
        }
      }
    `,
  ],
})
export class AboutCta {}
