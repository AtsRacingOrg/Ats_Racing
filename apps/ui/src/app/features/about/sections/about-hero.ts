import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ShapeDivider } from '../../../shared/ui/shape-divider/shape-divider';

@Component({
  selector: 'app-about-hero',
  standalone: true,
  imports: [ShapeDivider],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about-hero.html',
  styleUrl: './about-hero.scss',
})
export class AboutHero {}
