import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-hero" [style.--bg]="'url(' + image() + ')'">
      <div class="page-hero__overlay" aria-hidden="true"></div>
      <div class="container-page page-hero__content">
        @if (eyebrow()) {
          <p class="page-hero__eyebrow">{{ eyebrow() }}</p>
        }
        <h1>{{ title() }}</h1>
        @if (lead()) {
          <p class="page-hero__lead">{{ lead() }}</p>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .page-hero {
        position: relative;
        min-height: 420px;
        display: flex;
        align-items: flex-end;
        color: #ffffff;
        background-image: var(--bg);
        background-size: cover;
        background-position: center;
        padding-top: 6rem;
      }
      .page-hero__overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(13, 12, 15, 0.75), rgba(13, 12, 15, 0.95));
      }
      .page-hero__content {
        position: relative;
        padding-block: 5rem 4rem;
        max-width: 56rem;
      }
      .page-hero__eyebrow {
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
        font-weight: 600;
        text-transform: uppercase;
        color: #ffffff;
        font-size: clamp(2.5rem, 6vw, 4.25rem);
        line-height: 1;
        letter-spacing: -0.01em;
        margin: 0;
      }
      .page-hero__lead {
        margin: 1.25rem 0 0;
        max-width: 38rem;
        color: rgba(255, 255, 255, 0.78);
        font-size: 1.0625rem;
        line-height: 1.65;
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
