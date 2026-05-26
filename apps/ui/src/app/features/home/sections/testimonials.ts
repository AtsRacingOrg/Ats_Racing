import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CarouselModule } from 'primeng/carousel';
import { SectionHeading } from '../../../shared/ui/section-heading/section-heading';

interface Testimonial {
  readonly name: string;
  readonly car: string;
  readonly quote: string;
  readonly rating: number;
}

@Component({
  selector: 'app-home-testimonials',
  standalone: true,
  imports: [CarouselModule, SectionHeading],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './testimonials.html',
  styleUrl: './testimonials.scss',
})
export class HomeTestimonials {
  protected readonly testimonials: Testimonial[] = [
    {
      name: 'Mert K.',
      car: 'BMW M340i',
      quote: 'Stage 2 sonrası araç bambaşka oldu. Dyno raporu söz verilen rakamların üzerinde. Profesyonel ekip.',
      rating: 5,
    },
    {
      name: 'Selin A.',
      car: 'Audi A5',
      quote: 'Seramik kaplama uygulamasını burada yaptırdım. Detaycılıkları ve şeffaf süreçleri için teşekkürler.',
      rating: 5,
    },
    {
      name: 'Onur T.',
      car: 'Porsche 718',
      quote: 'Pist hazırlığı için tek adres. Frenleme ve şanzıman ayarlarındaki fark net hissediliyor.',
      rating: 5,
    },
    {
      name: 'Ece B.',
      car: 'Mercedes A45',
      quote: 'Randevu zamanında, iş zamanında teslim. İletişim ve sonrası destek mükemmel.',
      rating: 5,
    },
  ];

  protected readonly responsive = [
    { breakpoint: '1024px', numVisible: 2, numScroll: 1 },
    { breakpoint: '640px', numVisible: 1, numScroll: 1 },
  ];
}
