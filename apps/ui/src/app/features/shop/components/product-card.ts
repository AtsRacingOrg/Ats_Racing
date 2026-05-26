import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Product } from '../models/product';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CurrencyPipe, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {
  readonly product = input.required<Product>();

  protected readonly badgeLabel = computed(() => {
    const b = this.product().badge;
    if (b === 'sale') return 'İNDİRİM';
    if (b === 'new') return 'YENİ';
    if (b === 'popular') return 'POPÜLER';
    return null;
  });

  protected readonly stars = computed(() => Array.from({ length: 5 }, (_, i) => i < this.product().rating));
}
