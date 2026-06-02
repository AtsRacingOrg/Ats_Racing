import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

/**
 * Tablolar için sade sayfalama bileşeni.
 *
 * Kullanım:
 *   <app-paginator [total]="rows().length" [(page)]="page" [pageSize]="10" />
 *
 * `page` 1-bazlıdır. Sahip bileşen veri dilimini şu şekilde alır:
 *   const start = (page() - 1) * 10;
 *   rows().slice(start, start + 10);
 */
@Component({
  selector: 'app-paginator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (total() > pageSize()) {
      <div class="pgn">
        <span class="pgn__info">
          {{ rangeStart() }}–{{ rangeEnd() }} / {{ total() }}
        </span>
        <div class="pgn__controls">
          <button class="pgn__btn" type="button"
                  [disabled]="page() <= 1" (click)="setPage(1)" title="İlk sayfa">
            <i class="pi pi-angle-double-left"></i>
          </button>
          <button class="pgn__btn" type="button"
                  [disabled]="page() <= 1" (click)="setPage(page() - 1)" title="Önceki">
            <i class="pi pi-angle-left"></i>
          </button>
          <span class="pgn__page">Sayfa {{ page() }} / {{ totalPages() }}</span>
          <button class="pgn__btn" type="button"
                  [disabled]="page() >= totalPages()" (click)="setPage(page() + 1)" title="Sonraki">
            <i class="pi pi-angle-right"></i>
          </button>
          <button class="pgn__btn" type="button"
                  [disabled]="page() >= totalPages()" (click)="setPage(totalPages())" title="Son sayfa">
            <i class="pi pi-angle-double-right"></i>
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .pgn {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1rem; flex-wrap: wrap; padding: 0.7rem 0.9rem; margin-top: 0.5rem;
      border-radius: 10px; background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
    }
    .pgn__info { font-size: 0.75rem; color: rgba(255,255,255,0.5); }
    .pgn__controls { display: flex; align-items: center; gap: 0.3rem; }
    .pgn__btn {
      width: 30px; height: 30px; border-radius: 7px; cursor: pointer;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.65); display: flex; align-items: center; justify-content: center;
      transition: all 160ms;
      i { font-size: 0.78rem; }
      &:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: #fff; }
      &:disabled { opacity: 0.3; cursor: not-allowed; }
    }
    .pgn__page { font-size: 0.78rem; font-weight: 600; color: rgba(255,255,255,0.75); padding: 0 0.5rem; min-width: 90px; text-align: center; }
  `],
})
export class Paginator {
  total = input.required<number>();
  pageSize = input(10);
  page = model(1);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1,
  );
  protected readonly rangeEnd = computed(() =>
    Math.min(this.total(), this.page() * this.pageSize()),
  );

  protected setPage(p: number): void {
    const clamped = Math.max(1, Math.min(p, this.totalPages()));
    this.page.set(clamped);
  }
}
