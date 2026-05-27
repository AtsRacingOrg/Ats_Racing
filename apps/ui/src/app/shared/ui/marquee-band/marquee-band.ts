import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-marquee-band',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="mb"
      [class.mb--light]="theme() === 'light'"
      [class.mb--outline]="outline()"
      aria-label="Marquee"
    >
      <div class="mb__track" [style.animation-duration]="duration()" aria-hidden="true">
        <span class="mb__row">
          @for (chunk of repeated(); track $index) {
            <span class="mb__word">{{ text() }}</span>
            <span class="mb__sep" aria-hidden="true">
              <i class="pi pi-bolt"></i>
            </span>
          }
        </span>
        <span class="mb__row" aria-hidden="true">
          @for (chunk of repeated(); track $index) {
            <span class="mb__word">{{ text() }}</span>
            <span class="mb__sep" aria-hidden="true">
              <i class="pi pi-bolt"></i>
            </span>
          }
        </span>
      </div>
    </section>
  `,
  styles: [
    `
      .mb {
        background: #0d0c0f;
        color: #ffffff;
        overflow: hidden;
        position: relative;
        padding-block: 1.5rem;

        @media (min-width: 768px) {
          padding-block: 2.25rem;
        }
      }

      .mb--light {
        background: #f4f4f4;
        color: #18171a;
      }

      .mb__track {
        display: flex;
        width: max-content;
        animation: mb-scroll 50s linear infinite;
        will-change: transform;
      }

      .mb__row {
        display: inline-flex;
        align-items: center;
        gap: 2.5rem;
        padding-right: 2.5rem;
        flex-shrink: 0;
      }

      .mb__word {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: -0.01em;
        font-size: clamp(3rem, 9vw, 7.5rem);
        line-height: 0.95;
        white-space: nowrap;
        color: inherit;
      }

      .mb--outline .mb__word {
        color: transparent;
        -webkit-text-stroke: 1.5px rgba(255, 255, 255, 0.6);
      }

      .mb--outline.mb--light .mb__word {
        -webkit-text-stroke: 1.5px rgba(24, 23, 26, 0.6);
      }

      .mb__sep {
        color: #ea0a0b;
        font-size: clamp(1.5rem, 3vw, 2.5rem);
        display: inline-grid;
        place-items: center;
        flex-shrink: 0;
      }

      @keyframes mb-scroll {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
      }

      @media (prefers-reduced-motion: reduce) {
        .mb__track { animation: none; }
      }

      .mb:hover .mb__track {
        animation-play-state: paused;
      }
    `,
  ],
})
export class MarqueeBand {
  readonly text = input.required<string>();
  readonly theme = input<'dark' | 'light'>('dark');
  readonly outline = input<boolean>(false);
  readonly count = input<number>(5);
  readonly speedSeconds = input<number>(50);

  protected readonly duration = computed(() => `${this.speedSeconds()}s`);
  protected readonly repeated = computed(() => Array.from({ length: this.count() }));
}
