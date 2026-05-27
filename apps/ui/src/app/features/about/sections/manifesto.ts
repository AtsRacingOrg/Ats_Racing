import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-about-manifesto',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mani">
      <div class="mani__bg" aria-hidden="true"></div>
      <div class="mani__overlay" aria-hidden="true"></div>

      <div class="mani__inner">
        <p class="mani__eyebrow">Manifesto</p>
        <blockquote class="mani__quote">
          “Bir araba sadece metalden ibaret değil — sürücüsünün
          karakterinin uzantısıdır. Biz de o karakteri ortaya çıkarmak için varız.”
        </blockquote>
        <p class="mani__sign">— Ahmet Yıldız · Kurucu &amp; Baş Teknisyen</p>
      </div>
    </section>
  `,
  styles: [
    `
      .mani {
        position: relative;
        color: #ffffff;
        isolation: isolate;
        padding-block: 6rem;
        overflow: hidden;
        text-align: center;
      }
      .mani__bg {
        position: absolute;
        inset: 0;
        background-image: url('https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=2400&q=80');
        background-size: cover;
        background-position: center;
        z-index: -2;
      }
      .mani__overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(13, 12, 15, 0.9) 0%, rgba(13, 12, 15, 0.8) 100%);
        z-index: -1;
      }
      .mani__inner {
        max-width: 60rem;
        margin-inline: auto;
        padding-inline: 1.5rem;

        @media (min-width: 768px) { padding-inline: 3rem; }
      }
      .mani__eyebrow {
        font-family: 'DM Sans', sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.28em;
        font-size: 0.75rem;
        font-weight: 600;
        color: #ea0a0b;
        margin: 0 0 1.5rem;
      }
      .mani__quote {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 600;
        text-transform: uppercase;
        font-size: clamp(1.5rem, 3.6vw, 2.75rem);
        line-height: 1.15;
        color: #ffffff;
        margin: 0;
        letter-spacing: -0.005em;
      }
      .mani__sign {
        margin: 2rem 0 0;
        font-family: 'DM Sans', sans-serif;
        font-size: 0.8125rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: rgba(255, 255, 255, 0.65);
      }
    `,
  ],
})
export class AboutManifesto {}
