import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CarouselModule } from 'primeng/carousel';
import { SectionHeading } from '../../../shared/ui/section-heading/section-heading';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

interface Testimonial {
  readonly name: string;
  readonly car: string;
  readonly quoteKey: string;
  readonly rating: number;
}

@Component({
  selector: 'app-home-testimonials',
  standalone: true,
  imports: [CarouselModule, SectionHeading, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './testimonials.html',
  styleUrl: './testimonials.scss',
})
export class HomeTestimonials {
  // İsim ve araç modeli evrensel olduğundan çevrilmez; yorum metni çevrilir.
  protected readonly testimonials: Testimonial[] = [
    { name: 'Mert K.', car: 'BMW M340i', quoteKey: 'testi.1.quote', rating: 5 },
    { name: 'Selin A.', car: 'Audi A5', quoteKey: 'testi.2.quote', rating: 5 },
    { name: 'Onur T.', car: 'Porsche 718', quoteKey: 'testi.3.quote', rating: 5 },
    { name: 'Ece B.', car: 'Mercedes A45', quoteKey: 'testi.4.quote', rating: 5 },
  ];

  protected readonly responsive = [
    { breakpoint: '1024px', numVisible: 2, numScroll: 1 },
    { breakpoint: '640px', numVisible: 1, numScroll: 1 },
  ];
}
