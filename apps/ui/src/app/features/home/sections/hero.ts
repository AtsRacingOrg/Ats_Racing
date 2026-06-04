import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

interface HeroSlide {
  readonly line1Key: string;
  readonly line2Key: string;
  readonly leadKey: string;
  readonly image: string;
}

const AUTOPLAY_MS = 6000;

@Component({
  selector: 'app-home-hero',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class HomeHero implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly slides: readonly HeroSlide[] = [
    {
      line1Key: 'hero.1.line1', line2Key: 'hero.1.line2', leadKey: 'hero.1.lead',
      image: 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=2400&q=80',
    },
    {
      line1Key: 'hero.2.line1', line2Key: 'hero.2.line2', leadKey: 'hero.2.lead',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2400&q=80',
    },
    {
      line1Key: 'hero.3.line1', line2Key: 'hero.3.line2', leadKey: 'hero.3.lead',
      image: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=2400&q=80',
    },
    {
      line1Key: 'hero.4.line1', line2Key: 'hero.4.line2', leadKey: 'hero.4.lead',
      image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=2400&q=80',
    },
  ];

  protected readonly active = signal(0);
  protected readonly paused = signal(false);

  ngOnInit(): void {
    const id = setInterval(() => {
      if (!this.paused()) this.next();
    }, AUTOPLAY_MS);
    this.destroyRef.onDestroy(() => clearInterval(id));
  }

  protected next(): void {
    this.active.update((v) => (v + 1) % this.slides.length);
  }

  protected prev(): void {
    this.active.update((v) => (v - 1 + this.slides.length) % this.slides.length);
  }

  protected go(i: number): void {
    this.active.set(i);
  }

  protected setPaused(state: boolean): void {
    this.paused.set(state);
  }
}
