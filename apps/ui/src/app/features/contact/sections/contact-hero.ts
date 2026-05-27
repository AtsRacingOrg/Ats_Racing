import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ShapeDivider } from '../../../shared/ui/shape-divider/shape-divider';

@Component({
  selector: 'app-contact-hero',
  standalone: true,
  imports: [ShapeDivider],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-hero.html',
  styleUrl: './contact-hero.scss',
})
export class ContactHero {}
