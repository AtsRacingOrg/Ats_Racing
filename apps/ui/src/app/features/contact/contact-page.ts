import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { MarqueeBand } from '../../shared/ui/marquee-band/marquee-band';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ContactForm } from './sections/contact-form';
import { ContactHero } from './sections/contact-hero';
import { ContactHoursFaq } from './sections/hours-faq';
import { ContactInfo } from './sections/contact-info';
import { ContactMap } from './sections/contact-map';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [ContactHero, ContactForm, ContactInfo, ContactHoursFaq, ContactMap, MarqueeBand, RevealDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-contact-hero></app-contact-hero>

    <section class="cwrap">
      <div class="cwrap__inner">
        <app-contact-form class="cwrap__form" appReveal="fade-right"></app-contact-form>
        <app-contact-info class="cwrap__info" appReveal="fade-left" [revealDelay]="120"></app-contact-info>
      </div>
    </section>

    <app-marquee-band [text]="'contact.marquee' | t"></app-marquee-band>

    <app-contact-hours-faq></app-contact-hours-faq>
    <app-contact-map></app-contact-map>
  `,
  styles: [
    `
      .cwrap {
        background: #f4f4f4;
        padding-block: 5rem;
      }
      .cwrap__inner {
        max-width: 1600px;
        margin-inline: auto;
        padding-inline: 1.5rem;
        display: grid;
        gap: 2rem;
        align-items: stretch;
      }
      @media (min-width: 768px) { .cwrap__inner { padding-inline: 3rem; } }
      @media (min-width: 1024px) {
        .cwrap__inner {
          grid-template-columns: 1.4fr 1fr;
          gap: 3rem;
        }
      }
      @media (min-width: 1280px) { .cwrap__inner { padding-inline: 70px; } }
      .cwrap__form,
      .cwrap__info {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export default class ContactPage {}
