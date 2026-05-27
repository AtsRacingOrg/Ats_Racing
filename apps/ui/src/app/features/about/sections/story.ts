import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { SectionHeading } from '../../../shared/ui/section-heading/section-heading';

@Component({
  selector: 'app-about-story',
  standalone: true,
  imports: [SectionHeading, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './story.html',
  styleUrl: './story.scss',
})
export class AboutStory {}
