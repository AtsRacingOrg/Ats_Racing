import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type Variant = 'wave' | 'wave-soft' | 'curve' | 'tilt';
type Position = 'top' | 'bottom';

const PATHS: Record<Variant, string> = {
  // Multi-layered animated-ready wave
  wave: 'M0,64 C240,128 480,0 720,48 C960,96 1200,32 1440,64 L1440,120 L0,120 Z',
  // Soft single curve
  'wave-soft': 'M0,80 C360,0 1080,160 1440,40 L1440,120 L0,120 Z',
  // Symmetric upward curve
  curve: 'M0,120 Q720,0 1440,120 Z',
  // Diagonal tilt
  tilt: 'M0,120 L1440,0 L1440,120 Z',
};

@Component({
  selector: 'app-shape-divider',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="sd"
      [class.sd--top]="position() === 'top'"
      [class.sd--bottom]="position() === 'bottom'"
      [class.sd--animated]="animated()"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        @if (animated() && variant() === 'wave') {
          <path
            class="sd__wave sd__wave--back"
            [attr.d]="path()"
            [attr.fill]="backColor()"
          ></path>
          <path
            class="sd__wave sd__wave--mid"
            [attr.d]="path()"
            [attr.fill]="midColor()"
          ></path>
        }
        <path
          class="sd__wave sd__wave--front"
          [attr.d]="path()"
          [attr.fill]="color()"
        ></path>
      </svg>
    </div>
  `,
  styles: [
    `
      .sd {
        position: absolute;
        left: 0;
        right: 0;
        line-height: 0;
        pointer-events: none;
        z-index: 2;
      }
      .sd--bottom { bottom: -1px; }
      .sd--top {
        top: -1px;
        transform: scaleY(-1);
      }
      svg {
        display: block;
        width: 100%;
        height: clamp(60px, 9vw, 140px);
      }
      .sd__wave {
        transform-origin: center;
      }
      .sd--animated .sd__wave--back {
        animation: sd-drift 26s ease-in-out infinite;
        transform: translate3d(0, 6px, 0);
      }
      .sd--animated .sd__wave--mid {
        animation: sd-drift 18s ease-in-out infinite reverse;
        transform: translate3d(0, 3px, 0);
      }
      .sd--animated .sd__wave--front {
        animation: sd-drift 12s ease-in-out infinite;
      }
      @keyframes sd-drift {
        0%, 100% { transform: translate3d(0, 0, 0); }
        50%      { transform: translate3d(-24px, 4px, 0); }
      }
      @media (prefers-reduced-motion: reduce) {
        .sd__wave { animation: none !important; transform: none !important; }
      }
    `,
  ],
})
export class ShapeDivider {
  readonly variant = input<Variant>('wave');
  readonly position = input<Position>('bottom');
  /** Solid color of the next section (the wave fills with this). */
  readonly color = input<string>('#ffffff');
  /** Optional secondary tints for the animated wave layers. */
  readonly midColor = input<string>('rgba(255, 255, 255, 0.55)');
  readonly backColor = input<string>('rgba(255, 255, 255, 0.25)');
  readonly animated = input<boolean>(false);

  protected readonly path = computed(() => PATHS[this.variant()]);
}
