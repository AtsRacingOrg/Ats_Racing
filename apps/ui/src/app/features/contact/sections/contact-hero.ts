import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { ShapeDivider } from '../../../shared/ui/shape-divider/shape-divider';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-contact-hero',
  standalone: true,
  imports: [ShapeDivider, RevealDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-hero.html',
  styleUrl: './contact-hero.scss',
})
export class ContactHero {}
