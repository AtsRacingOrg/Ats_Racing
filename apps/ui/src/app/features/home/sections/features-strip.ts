import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Pillar {
  readonly title: string;
  readonly text: string;
}

@Component({
  selector: 'app-home-features',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './features-strip.html',
  styleUrl: './features-strip.scss',
})
export class HomeFeatures {
  protected readonly pillars: readonly Pillar[] = [
    {
      title: 'What we do',
      text: 'ECU yazılımı, performans modifiyesi, frenleme ve detayl bakım. Her iş kendi atölyemizde, izlenebilir ve garantili.',
    },
    {
      title: 'The opportunities',
      text: 'Pist hazırlığı, günlük performans, klasik restorasyon veya estetik kişiselleştirme — her hedefe göre bir plan kurarız.',
    },
  ];
}
