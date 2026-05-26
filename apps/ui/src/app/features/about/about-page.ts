import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHero } from '../../shared/ui/page-hero/page-hero';
import { AboutCta } from './sections/cta-band';
import { AboutStats } from './sections/stats';
import { AboutStory } from './sections/story';
import { AboutTeam } from './sections/team';
import { AboutValues } from './sections/values';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [PageHero, AboutStory, AboutStats, AboutValues, AboutTeam, AboutCta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero
      eyebrow="Tanış"
      title="Hakkımızda"
      lead="Ats Racing — performans, modifiye ve profesyonel detayl alanında 12+ yıllık deneyim."
      image="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2400&q=80"
    ></app-page-hero>

    <app-about-story></app-about-story>
    <app-about-stats></app-about-stats>
    <app-about-values></app-about-values>
    <app-about-team></app-about-team>
    <app-about-cta></app-about-cta>
  `,
})
export default class AboutPage {}
