import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CountUpDirective } from '../../../shared/directives/count-up.directive';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

interface Stat {
  readonly value: number;
  readonly suffix: string;
  readonly label: string;
}

@Component({
  selector: 'app-home-stats',
  standalone: true,
  imports: [CountUpDirective, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="home-stats" class="stats" aria-label="Rakamlarla Ats Racing">
      <div class="stats__inner">
        <ul role="list">
          @for (s of stats; track s.label; let i = $index) {
            <li appReveal="fade-up" [revealDelay]="i * 120">
              <span class="stats__num" aria-hidden="true">
                <span [appCountUp]="s.value" [suffix]="s.suffix"></span>
              </span>
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
    { value: 98, suffix: '', label: 'Hizmet' },
    { value: 65, suffix: '', label: 'Ekip' },
    { value: 12, suffix: '', label: 'Yıl' },
    { value: 15, suffix: '', label: 'Lokasyon' },
  ];
}
