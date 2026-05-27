import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarqueeBand } from '../../shared/ui/marquee-band/marquee-band';
import { AboutHero } from './sections/about-hero';
import { AboutCredentials } from './sections/credentials';
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
    AboutCredentials,
    AboutTeam,
    AboutCta,
    MarqueeBand,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-about-hero></app-about-hero>
    <app-about-story></app-about-story>
    <app-about-showcase></app-about-showcase>

    <app-marquee-band text="ATS Racing · Tutku · Mühendislik · Disiplin"></app-marquee-band>

    <app-about-stats></app-about-stats>
    <app-about-values></app-about-values>
    <app-about-manifesto></app-about-manifesto>
    <app-about-credentials></app-about-credentials>
    <app-about-team></app-about-team>
    <app-about-cta></app-about-cta>
  `,
})
export default class AboutPage {}
