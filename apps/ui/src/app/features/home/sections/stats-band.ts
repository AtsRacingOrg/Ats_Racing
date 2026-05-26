import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Stat {
  readonly value: string;
  readonly label: string;
}

@Component({
  selector: 'app-home-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="home-stats" class="stats" aria-label="Rakamlarla Ats Racing">
      <div class="stats__inner">
        <ul role="list">
          @for (s of stats; track s.label) {
            <li>
              <span class="stats__num" aria-hidden="true">{{ s.value }}</span>
              <span class="stats__lbl">{{ s.label }}</span>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styleUrl: './stats-band.scss',
})
export class HomeStats {
  protected readonly stats: readonly Stat[] = [
    { value: '98', label: 'Hizmet' },
    { value: '65', label: 'Ekip' },
    { value: '12', label: 'Yıl' },
    { value: '15', label: 'Lokasyon' },
  ];
}
