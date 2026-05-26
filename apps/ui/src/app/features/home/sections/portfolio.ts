import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SectionHeading } from '../../../shared/ui/section-heading/section-heading';

interface Work {
  readonly title: string;
  readonly category: string;
  readonly image: string;
}

@Component({
  selector: 'app-home-portfolio',
  standalone: true,
  imports: [RouterLink, ButtonModule, SectionHeading],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio.html',
  styleUrl: './portfolio.scss',
})
export class HomePortfolio {
  protected readonly works: readonly Work[] = [
    {
      title: 'BMW M4 Stage 2',
      category: 'ECU + Egzoz',
      image:
        'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Audi RS6 Detayl',
      category: 'Seramik Kaplama',
      image:
        'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Porsche 911 Track Build',
      category: 'Tam Modifiye',
      image:
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Mercedes C63 AMG',
      category: 'Performans',
      image:
        'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Nissan GT-R R35',
      category: 'Stage 3 Tuning',
      image:
        'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Tesla Model S Plaid',
      category: 'PPF + Wrap',
      image:
        'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=900&q=80',
    },
  ];
}
