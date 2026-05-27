import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CountUpDirective } from '../../../shared/directives/count-up.directive';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

interface Stat {
  readonly value: number;
  readonly suffix: string;
  readonly label: string;
  /** If set, used as static display value instead of an animated count. */
  readonly display?: string;
}

@Component({
  selector: 'app-about-stats',
  standalone: true,
  imports: [CountUpDirective, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stats.html',
  styleUrl: './stats.scss',
})
export class AboutStats {
  protected readonly stats: readonly Stat[] = [
    { value: 12,  suffix: '+', label: 'Yıl Tecrübe' },
    { value: 450, suffix: '+', label: 'Tamamlanan Proje' },
    { value: 2400, suffix: '', label: 'Mutlu Müşteri' },
    { value: 0, suffix: '', label: 'Servis Desteği', display: '24/7' },
  ];
}
