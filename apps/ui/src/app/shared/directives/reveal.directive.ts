import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  input,
} from '@angular/core';

type RevealAnim = 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'zoom-in';

/**
 * Adds a reveal-on-scroll animation. Element starts hidden/transformed and
 * transitions to its natural state when it enters the viewport.
 *
 * Usage:
 *   <div appReveal></div>                          // fade-up default
 *   <div appReveal="fade-left" [revealDelay]="120"></div>
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  readonly appReveal = input<RevealAnim | ''>('fade-up');
  readonly revealDelay = input<number>(0);
  readonly revealThreshold = input<number>(0.15);
  readonly revealOnce = input<boolean>(true);

  ngOnInit(): void {
    const el = this.host.nativeElement;
    const anim = this.appReveal() || 'fade-up';
    el.classList.add('reveal', `reveal--${anim}`);

    if (this.revealDelay()) {
      el.style.transitionDelay = `${this.revealDelay()}ms`;
    }

    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add('is-visible');
            if (this.revealOnce()) this.observer?.disconnect();
          } else if (!this.revealOnce()) {
            el.classList.remove('is-visible');
          }
        }
      },
      { threshold: this.revealThreshold(), rootMargin: '0px 0px -8% 0px' },
    );
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
