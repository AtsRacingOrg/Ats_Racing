import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

interface Pillar {
  readonly titleKey: string;
  readonly textKey: string;
}

@Component({
  selector: 'app-home-features',
  standalone: true,
  imports: [RouterLink, RevealDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './features-strip.html',
  styleUrl: './features-strip.scss',
})
export class HomeFeatures {
  protected readonly pillars: readonly Pillar[] = [
    { titleKey: 'features.1.title', textKey: 'features.1.text' },
    { titleKey: 'features.2.title', textKey: 'features.2.text' },
  ];
}
