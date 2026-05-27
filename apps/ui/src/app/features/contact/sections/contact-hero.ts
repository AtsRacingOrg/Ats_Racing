import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { ShapeDivider } from '../../../shared/ui/shape-divider/shape-divider';

@Component({
  selector: 'app-contact-hero',
  standalone: true,
  imports: [ShapeDivider, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-hero.html',
  styleUrl: './contact-hero.scss',
})
export class ContactHero {}
