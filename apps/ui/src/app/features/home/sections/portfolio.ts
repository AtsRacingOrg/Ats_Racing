import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { SectionHeading } from '../../../shared/ui/section-heading/section-heading';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

interface Work {
  readonly title: string;
  readonly categoryKey: string;
  readonly image: string;
}

@Component({
  selector: 'app-home-portfolio',
  standalone: true,
  imports: [RouterLink, ButtonModule, SectionHeading, RevealDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio.html',
  styleUrl: './portfolio.scss',
})
export class HomePortfolio {
  // Araç/proje adları (BMW M4 Stage 2 vb.) evrensel olduğundan çevrilmez.
  protected readonly works: readonly Work[] = [
    { title: 'BMW M4 Stage 2', categoryKey: 'portfolio.cat.ecuExhaust',
      image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=900&q=80' },
    { title: 'Audi RS6 Detaylı', categoryKey: 'portfolio.cat.ceramic',
      image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=900&q=80' },
    { title: 'Porsche 911 Track Build', categoryKey: 'portfolio.cat.fullMod',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80' },
    { title: 'Mercedes C63 AMG', categoryKey: 'portfolio.cat.performance',
      image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=900&q=80' },
    { title: 'Nissan GT-R R35', categoryKey: 'portfolio.cat.stage3',
      image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=900&q=80' },
    { title: 'Tesla Model S Plaid', categoryKey: 'portfolio.cat.ppfWrap',
      image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=900&q=80' },
  ];
}
