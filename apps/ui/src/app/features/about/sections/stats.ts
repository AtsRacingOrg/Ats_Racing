import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Stat {
  readonly value: string;
  readonly label: string;
}

@Component({
  selector: 'app-about-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stats.html',
  styleUrl: './stats.scss',
})
export class AboutStats {
  protected readonly stats: readonly Stat[] = [
    { value: '12+', label: 'Yıl Tecrübe' },
    { value: '450+', label: 'Tamamlanan Proje' },
    { value: '2.4K', label: 'Mutlu Müşteri' },
    { value: '24/7', label: 'Servis Desteği' },
  ];
}
