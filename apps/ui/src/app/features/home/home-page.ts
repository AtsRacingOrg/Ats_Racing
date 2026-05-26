import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HomeFeatures } from './sections/features-strip';
import { HomeHero } from './sections/hero';
import { HomeNews } from './sections/news';
import { HomeNewsletter } from './sections/newsletter';
import { HomePortfolio } from './sections/portfolio';
import { HomeServices } from './sections/services';
import { HomeTestimonials } from './sections/testimonials';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    HomeHero,
    HomeServices,
    HomePortfolio,
    HomeFeatures,
    HomeTestimonials,
    HomeNews,
    HomeNewsletter,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-home-hero></app-home-hero>
    <app-home-services></app-home-services>
    <app-home-portfolio></app-home-portfolio>
    <app-home-features></app-home-features>

    @defer (on viewport; prefetch on idle) {
      <app-home-testimonials></app-home-testimonials>
    } @placeholder {
      <div class="defer-placeholder"></div>
    }

    <app-home-news></app-home-news>
    <app-home-newsletter></app-home-newsletter>
  `,
  styles: [`.defer-placeholder { min-height: 320px; }`],
})
export default class HomePage {}
