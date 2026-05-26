import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ph" [style.--bg]="'url(' + image() + ')'">
      <div class="ph__bg" aria-hidden="true"></div>
      <div class="ph__overlay" aria-hidden="true"></div>

      <div class="ph__marquee" aria-hidden="true">
        <span>{{ title() }} · {{ title() }} · {{ title() }} · {{ title() }}</span>
      </div>

      <div class="ph__inner">
        @if (eyebrow()) {
          <p class="ph__eyebrow">{{ eyebrow() }}</p>
        }
        <h1>{{ title() }}</h1>
        @if (lead()) {
          <p class="ph__lead">{{ lead() }}</p>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .ph {
        position: relative;
        min-height: 540px;
        display: flex;
        align-items: flex-end;
        color: #ffffff;
        padding-top: 6rem;
        overflow: hidden;
        isolation: isolate;
      }
      .ph__bg {
        position: absolute;
        inset: 0;
        background-image: var(--bg);
        background-size: cover;
        background-position: center;
        transform: scale(1.05);
        animation: ph-zoom 14s ease-out forwards;
        z-index: -2;
      }
      .ph__overlay {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(180deg, rgba(13, 12, 15, 0.35) 0%, rgba(13, 12, 15, 0.55) 60%, rgba(13, 12, 15, 0.95) 100%);
        z-index: -1;
      }
      .ph__marquee {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 38%;
        overflow: hidden;
        pointer-events: none;
        z-index: 0;
        opacity: 0.08;

        span {
          display: inline-block;
          white-space: nowrap;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          text-transform: uppercase;
          font-size: clamp(5rem, 14vw, 13rem);
          line-height: 1;
          color: #ffffff;
          letter-spacing: -0.02em;
          animation: ph-marq 22s linear infinite;
        }
      }
      .ph__inner {
        position: relative;
        width: 100%;
        max-width: 1600px;
        margin-inline: auto;
        padding: 5rem 1.5rem 4rem;
        max-width: 1600px;
      }
      @media (min-width: 768px) {
        .ph__inner { padding: 6rem 3rem 5rem; }
      }
      @media (min-width: 1280px) {
        .ph__inner { padding: 7rem 70px 5rem; }
      }
      .ph__eyebrow {
        font-family: 'DM Sans', sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.24em;
        color: #ea0a0b;
        font-size: 0.8125rem;
        font-weight: 600;
        margin: 0 0 1rem;
      }
      h1 {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 700;
        text-transform: uppercase;
        color: #ffffff;
        font-size: clamp(2.75rem, 8vw, 6rem);
        line-height: 0.96;
        letter-spacing: -0.015em;
        margin: 0;
        text-shadow: 0 2px 24px rgba(0, 0, 0, 0.4);
      }
      .ph__lead {
        margin: 1.5rem 0 0;
        max-width: 38rem;
        color: rgba(255, 255, 255, 0.78);
        font-size: 1.0625rem;
        line-height: 1.65;
      }
      @keyframes ph-zoom {
        from { transform: scale(1.12); }
        to   { transform: scale(1); }
      }
      @keyframes ph-marq {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
      }
      @media (prefers-reduced-motion: reduce) {
        .ph__bg, .ph__marquee span { animation: none; transform: none; }
      }
    `,
  ],
})
export class PageHero {
  readonly eyebrow = input<string>('');
  readonly title = input.required<string>();
  readonly lead = input<string>('');
  readonly image = input.required<string>();
}
