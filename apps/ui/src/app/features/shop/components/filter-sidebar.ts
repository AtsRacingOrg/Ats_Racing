import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, model, output } from '@angular/core';
import { CATEGORIES, Category } from '../models/product';

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filter-sidebar.html',
  styleUrl: './filter-sidebar.scss',
})
export class FilterSidebar {
  protected readonly categories = CATEGORIES;

  readonly selected = model<Category | null>(null);
  readonly maxPrice = model<number>(100000);
  readonly cleared = output<void>();

  protected pick(c: Category | null): void {
    this.selected.set(c);
  }

  protected onPriceInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.maxPrice.set(value);
  }

  protected clear(): void {
    this.selected.set(null);
    this.maxPrice.set(100000);
    this.cleared.emit();
  }
}
