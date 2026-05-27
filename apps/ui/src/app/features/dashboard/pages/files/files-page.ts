import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface TuningFile {
  id: string;
  vehicle: string;
  brand: string;
  fileName: string;
  type: string;
  ecu: string;
  date: Date;
  amount: number;
  status: 'Teslim Edildi' | 'Hazırlanıyor' | 'İncelemede';
  downloadable: boolean;
}

@Component({
  selector: 'app-files-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fp">

      <!-- HEADER -->
      <div class="fp__header">
        <div>
          <h1 class="fp__title">Dosyalarım</h1>
          <p class="fp__sub">Satın aldığınız tüm tuning yazılım dosyaları</p>
        </div>
        <div class="fp__summary">
          <div class="fp__sum-item">
            <span class="fp__sum-val">{{ files.length }}</span>
            <span class="fp__sum-lbl">Toplam Dosya</span>
          </div>
          <div class="fp__sum-sep"></div>
          <div class="fp__sum-item">
            <span class="fp__sum-val">{{ totalSpent() | currency:'TRY':'symbol':'1.0-0':'tr' }}</span>
            <span class="fp__sum-lbl">Toplam Harcama</span>
          </div>
          <div class="fp__sum-sep"></div>
          <div class="fp__sum-item">
            <span class="fp__sum-val">{{ deliveredCount() }}</span>
            <span class="fp__sum-lbl">Teslim Edildi</span>
          </div>
        </div>
      </div>

      <!-- FILTER BAR -->
      <div class="fp__filters">
        <div class="fp__search">
          <i class="pi pi-search"></i>
          <input
            type="text"
            placeholder="Araç veya dosya ara…"
            [(ngModel)]="search"
            (input)="onSearch()"
          />
        </div>
        <div class="fp__filter-chips">
          @for (f of filterOptions; track f.value) {
            <button
              class="filter-chip"
              [class.filter-chip--active]="activeFilter() === f.value"
              (click)="activeFilter.set(f.value)"
            >{{ f.label }}</button>
          }
        </div>
      </div>

      <!-- TABLE -->
      <div class="fp__table-wrap">
        <table class="fp__table">
          <thead>
            <tr>
              <th>Araç</th>
              <th>Dosya Adı</th>
              <th>Tür</th>
              <th>ECU</th>
              <th>Tarih</th>
              <th>Tutar</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            @if (filtered().length === 0) {
              <tr>
                <td colspan="8" class="fp__empty">
                  <i class="pi pi-inbox"></i>
                  <span>Dosya bulunamadı</span>
                </td>
              </tr>
            }
            @for (f of filtered(); track f.id) {
              <tr class="fp__row">
                <td>
                  <div class="fp__vehicle">
                    <div class="fp__vehicle-icon">
                      <i class="pi pi-car"></i>
                    </div>
                    <span>{{ f.vehicle }}</span>
                  </div>
                </td>
                <td class="fp__filename">{{ f.fileName }}</td>
                <td>
                  <span class="type-chip">{{ f.type }}</span>
                </td>
                <td class="fp__ecu">{{ f.ecu }}</td>
                <td class="fp__date">{{ f.date | date:'d MMM yyyy' : '' : 'tr' }}</td>
                <td class="fp__amount">{{ f.amount | currency:'TRY':'symbol':'1.0-0':'tr' }}</td>
                <td>
                  <span class="status-chip" [class]="statusClass(f.status)">
                    <span class="status-dot"></span>
                    {{ f.status }}
                  </span>
                </td>
                <td>
                  <div class="fp__actions">
                    @if (f.downloadable) {
                      <button class="fp__btn fp__btn--dl" title="İndir">
                        <i class="pi pi-download"></i>
                      </button>
                    } @else {
                      <button class="fp__btn fp__btn--disabled" title="Henüz hazır değil" disabled>
                        <i class="pi pi-clock"></i>
                      </button>
                    }
                    <button class="fp__btn" title="Detay">
                      <i class="pi pi-eye"></i>
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- PAGINATION (static demo) -->
      <div class="fp__pagination">
        <span class="fp__page-info">{{ filtered().length }} / {{ files.length }} dosya gösteriliyor</span>
        <div class="fp__page-btns">
          <button class="fp__page-btn" disabled><i class="pi pi-chevron-left"></i></button>
          <button class="fp__page-btn fp__page-btn--active">1</button>
          <button class="fp__page-btn">2</button>
          <button class="fp__page-btn"><i class="pi pi-chevron-right"></i></button>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .fp { display: flex; flex-direction: column; gap: 1.5rem; }

    .fp__header {
      display: flex; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap; gap: 1rem;
    }
    .fp__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .fp__sub { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }

    .fp__summary {
      display: flex; align-items: center; gap: 1.25rem;
      background: #1a1d27;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px; padding: 1rem 1.5rem;
    }
    .fp__sum-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .fp__sum-val { font-size: 1.2rem; font-weight: 700; color: #fff; }
    .fp__sum-lbl { font-size: 0.7rem; color: rgba(255,255,255,0.4); white-space: nowrap; }
    .fp__sum-sep { width: 1px; height: 32px; background: rgba(255,255,255,0.08); }

    /* FILTERS */
    .fp__filters {
      display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
    }
    .fp__search {
      display: flex; align-items: center; gap: 0.625rem;
      background: #1a1d27;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px; padding: 0.625rem 1rem;
      flex: 1; min-width: 200px;
      transition: border-color 200ms;
    }
    .fp__search:focus-within { border-color: rgba(230,57,70,0.5); }
    .fp__search i { color: rgba(255,255,255,0.35); font-size: 0.875rem; }
    .fp__search input {
      background: transparent; border: none; outline: none;
      color: rgba(255,255,255,0.85); font-size: 0.875rem; width: 100%;
    }
    .fp__search input::placeholder { color: rgba(255,255,255,0.3); }

    .fp__filter-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .filter-chip {
      padding: 0.5rem 1rem; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08);
      background: #1a1d27; color: rgba(255,255,255,0.5);
      font-size: 0.8rem; cursor: pointer;
      transition: all 180ms;
    }
    .filter-chip:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.85); }
    .filter-chip--active {
      background: rgba(230,57,70,0.15);
      border-color: rgba(230,57,70,0.4);
      color: #e63946;
    }

    /* TABLE */
    .fp__table-wrap {
      background: #1a1d27;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px; overflow: hidden;
    }
    .fp__table {
      width: 100%; border-collapse: collapse;
    }
    .fp__table thead th {
      padding: 1rem 1.25rem;
      font-size: 0.72rem; font-weight: 600;
      color: rgba(255,255,255,0.35);
      text-transform: uppercase; letter-spacing: 0.06em;
      text-align: left;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      white-space: nowrap;
    }
    .fp__row {
      border-bottom: 1px solid rgba(255,255,255,0.04);
      transition: background 160ms;
    }
    .fp__row:last-child { border-bottom: none; }
    .fp__row:hover { background: rgba(255,255,255,0.025); }
    .fp__row td {
      padding: 1rem 1.25rem;
      font-size: 0.82rem; color: rgba(255,255,255,0.7);
      vertical-align: middle;
    }

    .fp__vehicle { display: flex; align-items: center; gap: 0.625rem; }
    .fp__vehicle-icon {
      width: 32px; height: 32px; border-radius: 8px;
      background: rgba(230,57,70,0.12); color: #e63946;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.85rem; flex-shrink: 0;
    }
    .fp__vehicle span { font-weight: 600; color: rgba(255,255,255,0.9); white-space: nowrap; }
    .fp__filename { font-family: 'Courier New', monospace; font-size: 0.75rem; color: rgba(255,255,255,0.45); }
    .fp__ecu { font-size: 0.75rem; color: rgba(255,255,255,0.45); }
    .fp__date { white-space: nowrap; }
    .fp__amount { font-weight: 700; color: #fff; white-space: nowrap; }

    .type-chip {
      background: rgba(96,165,250,0.12);
      color: #60a5fa;
      font-size: 0.7rem; font-weight: 600;
      padding: 3px 10px; border-radius: 20px;
      white-space: nowrap;
    }

    .status-chip {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 0.72rem; font-weight: 600;
      padding: 4px 10px; border-radius: 20px;
      white-space: nowrap;
    }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .status--delivered { background: rgba(74,222,128,0.12); color: #4ade80; }
    .status--preparing { background: rgba(251,191,36,0.12); color: #fbbf24; }
    .status--review    { background: rgba(96,165,250,0.12); color: #60a5fa; }

    .fp__actions { display: flex; gap: 0.5rem; }
    .fp__btn {
      width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5);
      transition: background 180ms, color 180ms;
    }
    .fp__btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .fp__btn--dl { background: rgba(74,222,128,0.12); color: #4ade80; }
    .fp__btn--dl:hover { background: rgba(74,222,128,0.2); color: #4ade80; }
    .fp__btn--disabled { opacity: 0.4; cursor: not-allowed; }

    .fp__empty {
      text-align: center; padding: 3rem !important;
      color: rgba(255,255,255,0.3);
      display: table-cell;
    }
    .fp__empty i { font-size: 2rem; display: block; margin-bottom: 0.5rem; }

    /* PAGINATION */
    .fp__pagination {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 1rem;
    }
    .fp__page-info { font-size: 0.8rem; color: rgba(255,255,255,0.35); }
    .fp__page-btns { display: flex; gap: 0.375rem; }
    .fp__page-btn {
      width: 34px; height: 34px; border-radius: 8px; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      background: #1a1d27;
      border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.5);
      font-size: 0.82rem; font-weight: 500;
      transition: all 180ms;
    }
    .fp__page-btn:hover:not(:disabled) { border-color: rgba(255,255,255,0.2); color: #fff; }
    .fp__page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .fp__page-btn--active { background: rgba(230,57,70,0.15); border-color: rgba(230,57,70,0.4); color: #e63946; }
  `],
})
export class FilesPage {
  protected search = '';
  protected readonly activeFilter = signal<string>('all');

  protected readonly filterOptions = [
    { label: 'Tümü', value: 'all' },
    { label: 'Teslim Edildi', value: 'Teslim Edildi' },
    { label: 'Hazırlanıyor', value: 'Hazırlanıyor' },
    { label: 'İncelemede', value: 'İncelemede' },
  ];

  protected readonly files: TuningFile[] = [
    { id: '1', vehicle: 'BMW M3 F80', brand: 'BMW', fileName: 'bmw_m3_f80_stage2.bin', type: 'Stage 2', ecu: 'Bosch MG1', date: new Date('2025-05-20'), amount: 1500, status: 'Teslim Edildi', downloadable: true },
    { id: '2', vehicle: 'Audi RS6 C8', brand: 'Audi', fileName: 'audi_rs6_c8_pop_bang.bin', type: 'Pop & Bang', ecu: 'Bosch MED17', date: new Date('2025-05-15'), amount: 950, status: 'Teslim Edildi', downloadable: true },
    { id: '3', vehicle: 'VW Golf R Mk8', brand: 'VW', fileName: 'vw_golf_r_mk8_stage1.bin', type: 'Stage 1', ecu: 'Bosch MG1CS', date: new Date('2025-05-28'), amount: 750, status: 'Hazırlanıyor', downloadable: false },
    { id: '4', vehicle: 'Mercedes C63 AMG', brand: 'Mercedes', fileName: 'merc_c63_amg_dpf_egr.bin', type: 'DPF+EGR Off', ecu: 'Siemens SIM', date: new Date('2025-04-10'), amount: 1200, status: 'Teslim Edildi', downloadable: true },
    { id: '5', vehicle: 'Porsche 911 Turbo S', brand: 'Porsche', fileName: 'porsche_911ts_stage1.bin', type: 'Stage 1', ecu: 'Bosch ME7', date: new Date('2025-03-22'), amount: 2200, status: 'Teslim Edildi', downloadable: true },
    { id: '6', vehicle: 'BMW M5 F90', brand: 'BMW', fileName: 'bmw_m5_f90_stage3.bin', type: 'Stage 3', ecu: 'Bosch MG1', date: new Date('2025-03-05'), amount: 1850, status: 'İncelemede', downloadable: false },
  ];

  protected readonly searchSignal = signal('');

  protected readonly filtered = computed(() => {
    const q = this.searchSignal().toLowerCase();
    const f = this.activeFilter();
    return this.files.filter(file => {
      const matchQ = !q || file.vehicle.toLowerCase().includes(q) || file.fileName.toLowerCase().includes(q) || file.type.toLowerCase().includes(q);
      const matchF = f === 'all' || file.status === f;
      return matchQ && matchF;
    });
  });

  protected readonly totalSpent = computed(() => this.files.reduce((s, f) => s + f.amount, 0));
  protected readonly deliveredCount = computed(() => this.files.filter(f => f.status === 'Teslim Edildi').length);

  onSearch(): void {
    this.searchSignal.set(this.search);
  }

  statusClass(status: TuningFile['status']): string {
    const map: Record<TuningFile['status'], string> = {
      'Teslim Edildi': 'status-chip status--delivered',
      'Hazırlanıyor': 'status-chip status--preparing',
      'İncelemede': 'status-chip status--review',
    };
    return map[status];
  }
}
