import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CountUpDirective } from '../../../shared/directives/count-up.directive';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

interface Stat {
  readonly value: number;
  readonly suffix: string;
  readonly labelKey: string;
}

@Component({
  selector: 'app-home-stats',
  standalone: true,
  imports: [CountUpDirective, RevealDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="home-stats" class="stats" aria-label="Ats Racing">
      <div class="stats__inner">
        <ul role="list">
          @for (s of stats; track s.labelKey; let i = $index) {
            <li appReveal="fade-up" [revealDelay]="i * 120">
              <span class="stats__num" aria-hidden="true">
                <span [appCountUp]="s.value" [suffix]="s.suffix"></span>
              </span>
              <span class="stats__lbl">{{ s.labelKey | t }}</span>
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
    { value: 98, suffix: '', labelKey: 'stats.services' },
    { value: 65, suffix: '', labelKey: 'stats.team' },
    { value: 12, suffix: '', labelKey: 'stats.years' },
    { value: 15, suffix: '', labelKey: 'stats.locations' },
  ];
}
