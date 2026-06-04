import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarqueeBand } from '../../shared/ui/marquee-band/marquee-band';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { HomeChipCalculator } from './sections/chip-calculator';
import { HomeCustomize } from './sections/customize';
import { HomeFeatures } from './sections/features-strip';
import { HomeHero } from './sections/hero';
import { HomeNews } from './sections/news';
import { HomeNewsletter } from './sections/newsletter';
import { HomePortfolio } from './sections/portfolio';
import { HomeServices } from './sections/services';
import { HomeStats } from './sections/stats-band';
import { HomeTestimonials } from './sections/testimonials';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    HomeHero,
    HomeChipCalculator,
    HomeStats,
    HomeServices,
    HomeCustomize,
    HomeFeatures,
    HomePortfolio,
    HomeTestimonials,
    HomeNews,
    HomeNewsletter,
    MarqueeBand,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-home-hero></app-home-hero>
    <app-home-chip-calculator></app-home-chip-calculator>
    <app-home-stats></app-home-stats>
    <app-home-customize></app-home-customize>
    <app-home-services></app-home-services>

    <app-marquee-band [text]="'marquee.services' | t"></app-marquee-band>

    <app-home-features></app-home-features>
    <app-home-portfolio></app-home-portfolio>

    @defer (on viewport; prefetch on idle) {
      <app-home-testimonials></app-home-testimonials>
    } @placeholder {
      <div class="defer-placeholder"></div>
    }

    <app-marquee-band
      text="Ats Racing"
      [outline]="true"
      [speedSeconds]="65"
    ></app-marquee-band>

    <app-home-news></app-home-news>
    <app-home-newsletter></app-home-newsletter>
  `,
  styles: [`.defer-placeholder { min-height: 320px; }`],
})
export default class HomePage {}
