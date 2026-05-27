import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Tile {
  readonly title: string;
  readonly tag: string;
  readonly image: string;
}

@Component({
  selector: 'app-about-showcase',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="atiles" aria-label="Atölyemizden kareler">
      <ul role="list">
        @for (t of tiles; track t.title) {
          <li class="atile">
            <img [src]="t.image" [alt]="t.title" loading="lazy" decoding="async" />
            <div class="atile__veil" aria-hidden="true"></div>
            <div class="atile__copy">
              <p class="atile__tag">{{ t.tag }}</p>
              <h3 class="atile__title">{{ t.title }}</h3>
            </div>
          </li>
        }
      </ul>
    </section>
  `,
  styleUrl: './showcase-tiles.scss',
})
export class AboutShowcase {
  protected readonly tiles: readonly Tile[] = [
    {
      title: 'Atölye',
      tag: 'Üretim Hattı',
      image: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Dyno Tesisi',
      tag: 'Ölçüm & Test',
      image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Detayl Bölümü',
      tag: 'Bakım Hattı',
      image: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1200&q=80',
    },
  ];
}
