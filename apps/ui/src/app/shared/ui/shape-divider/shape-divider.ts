import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type Variant = 'wave' | 'wave-soft' | 'curve' | 'tilt';
type Position = 'top' | 'bottom';

// All paths form a "smile" curve (∪): the wave's peaks point DOWN into
// the next section. The fill stays at the bottom — it's the next
// section's color rising at the edges and dipping in the middle, so the
// hero appears to drop down into the next section in the middle.
const PATHS: Record<Variant, string> = {
  // Multi-peak wave with downward dips
  wave: 'M0,30 C200,30 320,100 540,90 C720,82 900,30 1080,30 C1240,30 1360,100 1440,90 L1440,120 L0,120 Z',
  // Soft single smile
  'wave-soft': 'M0,30 Q720,110 1440,30 L1440,120 L0,120 Z',
  // Strong symmetric smile
  curve: 'M0,20 Q720,120 1440,20 L1440,120 L0,120 Z',
  // Diagonal — top-left high, bottom-right low
  tilt: 'M0,30 L1440,90 L1440,120 L0,120 Z',
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
