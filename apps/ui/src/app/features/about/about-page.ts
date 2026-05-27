import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AboutHero } from './sections/about-hero';
import { AboutCta } from './sections/cta-band';
import { AboutManifesto } from './sections/manifesto';
import { AboutShowcase } from './sections/showcase-tiles';
import { AboutStats } from './sections/stats';
import { AboutStory } from './sections/story';
import { AboutTeam } from './sections/team';
import { AboutValues } from './sections/values';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [
    AboutHero,
    AboutStory,
    AboutShowcase,
    AboutStats,
    AboutValues,
    AboutManifesto,
    AboutTeam,
    AboutCta,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-about-hero></app-about-hero>
    <app-about-story></app-about-story>
    <app-about-showcase></app-about-showcase>
    <app-about-stats></app-about-stats>
    <app-about-values></app-about-values>
    <app-about-manifesto></app-about-manifesto>
    <app-about-team></app-about-team>
    <app-about-cta></app-about-cta>
  `,
})
export default class AboutPage {}
