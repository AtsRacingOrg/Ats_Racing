import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ShapeDivider } from '../../../shared/ui/shape-divider/shape-divider';

interface HeroSlide {
  readonly line1: string;
  readonly line2: string;
  readonly lead: string;
  readonly image: string;
}

const AUTOPLAY_MS = 6000;

@Component({
  selector: 'app-home-hero',
  standalone: true,
  imports: [ShapeDivider],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class HomeHero implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly slides: readonly HeroSlide[] = [
    {
      line1: 'Performans tutkunlarının',
      line2: "İstanbul'daki adresi",
      lead: 'ECU yazılımı, performans modifiyesi ve profesyonel detayl bakım — 12 yıllık deneyim, ölçülebilir sonuçlar.',
      image: 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=2400&q=80',
    },
    {
      line1: 'Aracını sıradanlıktan',
      line2: 'kurtaracak ekip',
      lead: 'Stage 1–3 chip tuning, dyno test ve hassas haritalama. Her ayar belgelenir, her iş garantilenir.',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2400&q=80',
    },
    {
      line1: 'Detaylı bakım',
      line2: 'tutkunun seviyesinde',
      lead: 'Seramik kaplama, PPF, iç-dış detayl. Pist günü için de günlük kullanım için de eksiksiz hazırlık.',
      image: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=2400&q=80',
    },
    {
      line1: 'Pist hazırlığı',
      line2: 'mühendislik düzeyinde',
      lead: 'Brembo, AP Racing, Bilstein, KW. Aracını gerçek pist günlerine güvenle götür.',
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
