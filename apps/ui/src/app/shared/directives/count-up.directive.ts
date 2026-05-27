import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  input,
} from '@angular/core';

/**
 * Animates a numeric value from 0 → target when the element enters the
 * viewport. Use `prefix` / `suffix` for surrounding text. Honors
 * prefers-reduced-motion.
 *
 * Usage:
 *   <span [appCountUp]="450" suffix="+"></span>
 *   <span [appCountUp]="98" prefix="" suffix="%"></span>
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;
  private rafId = 0;
  private started = false;

  readonly appCountUp = input.required<number>();
  readonly duration = input<number>(1800);
  readonly prefix = input<string>('');
  readonly suffix = input<string>('');
  readonly decimals = input<number>(0);

  ngOnInit(): void {
    const el = this.host.nativeElement;
    el.textContent = this.format(0);

    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      this.run();
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !this.started) {
            this.run();
            this.observer?.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    this.observer.observe(el);
  }

  private run(): void {
    this.started = true;
    const target = this.appCountUp();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.host.nativeElement.textContent = this.format(target);
      return;
    }

    const start = performance.now();
    const dur = this.duration();

    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic
      const v = target * eased;
      this.host.nativeElement.textContent = this.format(v);
      if (t < 1) this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private format(v: number): string {
    return `${this.prefix()}${v.toFixed(this.decimals())}${this.suffix()}`;
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}
