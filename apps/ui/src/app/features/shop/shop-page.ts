import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { PageHero } from '../../shared/ui/page-hero/page-hero';
import { FilterSidebar } from './components/filter-sidebar';
import { ProductCard } from './components/product-card';
import { Category } from './models/product';
import { ProductsService } from './services/products.service';

const PAGE_SIZE = 6;

@Component({
  selector: 'app-shop-page',
  standalone: true,
  imports: [PageHero, FilterSidebar, ProductCard, PaginatorModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shop-page.html',
  styleUrl: './shop-page.scss',
})
export default class ShopPage {
  private readonly products = inject(ProductsService);

  protected readonly category = signal<Category | null>(null);
  protected readonly maxPrice = signal<number>(100000);
  protected readonly first = signal<number>(0);

  protected readonly filtered = computed(() =>
    this.products.list().filter((p) => {
      const okCat = this.category() === null || p.category === this.category();
      const okPrice = p.price <= this.maxPrice();
      return okCat && okPrice;
    }),
  );

  protected readonly visible = computed(() => {
    const start = this.first();
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  protected readonly pageSize = PAGE_SIZE;

  constructor() {
    effect(() => {
      this.category();
      this.maxPrice();
      this.first.set(0);
    });
  }

  protected onPage(event: PaginatorState): void {
    this.first.set(event.first ?? 0);
  }
}
