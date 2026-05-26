import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface Slide {
  readonly title: string;
  readonly category: string;
  readonly image: string;
}

@Component({
  selector: 'app-home-showcase',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './showcase-slider.html',
  styleUrl: './showcase-slider.scss',
})
export class HomeShowcase {
  protected readonly slides: readonly Slide[] = [
    {
      title: 'BMW M4 Stage 2',
      category: 'ECU + Egzoz',
      image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1800&q=80',
    },
    {
      title: 'Audi RS6 Detayl',
      category: 'Seramik Kaplama',
      image: 'https://images.unsplash.com/photo-1611821064430-0d40291922d2?auto=format&fit=crop&w=1800&q=80',
    },
    {
      title: 'Porsche 911 Track Build',
      category: 'Tam Modifiye',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=80',
    },
    {
      title: 'Mercedes C63 AMG',
      category: 'Performans',
      image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1800&q=80',
    },
  ];

  protected readonly active = signal(0);

  protected next(): void {
    this.active.update((v) => (v + 1) % this.slides.length);
  }

  protected prev(): void {
    this.active.update((v) => (v - 1 + this.slides.length) % this.slides.length);
  }

  protected go(i: number): void {
    this.active.set(i);
  }
}
