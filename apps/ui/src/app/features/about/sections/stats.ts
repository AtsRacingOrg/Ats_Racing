import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CountUpDirective } from '../../../shared/directives/count-up.directive';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

interface Stat {
  readonly value: number;
  readonly suffix: string;
  readonly labelKey: string;
  /** If set, used as static display value instead of an animated count. */
  readonly display?: string;
}

@Component({
  selector: 'app-about-stats',
  standalone: true,
  imports: [CountUpDirective, RevealDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stats.html',
  styleUrl: './stats.scss',
})
export class AboutStats {
  protected readonly stats: readonly Stat[] = [
    { value: 12,  suffix: '+', labelKey: 'about.stats.1' },
    { value: 450, suffix: '+', labelKey: 'about.stats.2' },
    { value: 2400, suffix: '', labelKey: 'about.stats.3' },
    { value: 0, suffix: '', labelKey: 'about.stats.4', display: '24/7' },
  ];
}
