import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ShapeDivider } from '../../../shared/ui/shape-divider/shape-divider';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-about-hero',
  standalone: true,
  imports: [ShapeDivider, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about-hero.html',
  styleUrl: './about-hero.scss',
})
export class AboutHero {}
