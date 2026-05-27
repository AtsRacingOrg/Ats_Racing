import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

interface TuningFile {
  id: string;
  vehicle: string;
  fileName: string;
  type: string;
  date: Date;
  amount: number;
  status: 'Teslim Edildi' | 'Hazırlanıyor' | 'İncelemede';
}

interface MonthStat {
  month: string;
  amount: number;
  files: number;
}

@Component({
  selector: 'app-overview-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ov">

      <!-- PAGE HEADER -->
      <div class="ov__header">
        <div>
          <h1 class="ov__title">Genel Bakış</h1>
          <p class="ov__sub">Hoş geldin, Ahmet 👋</p>
        </div>
        <span class="ov__date">{{ today | date:'d MMMM yyyy' : '' : 'tr' }}</span>
      </div>

      <!-- STAT CARDS -->
      <div class="ov__stats">
        @for (s of stats; track s.label) {
          <div class="stat-card">
            <div class="stat-card__icon" [style.background]="s.color + '1a'" [style.color]="s.color">
              <i [class]="'pi ' + s.icon"></i>
            </div>
            <div class="stat-card__body">
              <span class="stat-card__value">{{ s.value }}</span>
              <span class="stat-card__label">{{ s.label }}</span>
            </div>
            <div class="stat-card__trend" [class.stat-card__trend--up]="s.trendUp" [class.stat-card__trend--down]="!s.trendUp">
              <i [class]="'pi ' + (s.trendUp ? 'pi-arrow-up-right' : 'pi-arrow-down-right')"></i>
              {{ s.trend }}
            </div>
          </div>
        }
      </div>

      <!-- CHART + RECENT -->
      <div class="ov__grid">

        <!-- SVG BAR CHART -->
        <div class="dash-card">
          <div class="dash-card__head">
            <h2 class="dash-card__title">Aylık Harcama</h2>
            <div class="chart-legend">
              <span class="chart-legend__dot" style="background:#e63946"></span> Harcama (₺)
            </div>
          </div>
          <div class="chart-wrap">
            <svg viewBox="0 0 600 200" preserveAspectRatio="none" class="bar-chart" aria-hidden="true">
              <!-- Grid lines -->
              @for (line of gridLines; track line) {
                <line
                  [attr.x1]="48" [attr.y1]="line.y"
                  [attr.x2]="590" [attr.y2]="line.y"
                  stroke="rgba(255,255,255,0.06)" stroke-width="1"
                ></line>
                <text [attr.x]="40" [attr.y]="line.y + 4" text-anchor="end" fill="rgba(255,255,255,0.3)" font-size="9">
                  {{ line.label }}
                </text>
              }
              <!-- Bars -->
              @for (m of monthStats; track m.month; let i = $index) {
                <rect
                  [attr.x]="barX(i)"
                  [attr.y]="barY(m.amount)"
                  [attr.width]="barW"
                  [attr.height]="barH(m.amount)"
                  rx="4"
                  fill="url(#barGrad)"
                  class="chart-bar"
                >
                  <title>{{ m.month }}: {{ m.amount | currency:'TRY':'symbol':'1.0-0':'tr' }}</title>
                </rect>
                <text
                  [attr.x]="barX(i) + barW / 2"
                  [attr.y]="192"
                  text-anchor="middle"
                  fill="rgba(255,255,255,0.4)"
                  font-size="9"
                >{{ m.month }}</text>
              }
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#e63946"></stop>
                  <stop offset="100%" stop-color="#c1121f" stop-opacity="0.6"></stop>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <!-- RECENT FILES -->
        <div class="dash-card">
          <div class="dash-card__head">
            <h2 class="dash-card__title">Son Dosyalar</h2>
            <a routerLink="/dashboard/files" class="dash-link">Tümünü Gör →</a>
          </div>
          <div class="recent-list">
            @for (f of recentFiles; track f.id) {
              <div class="recent-item">
                <div class="recent-item__icon">
                  <i class="pi pi-file"></i>
                </div>
                <div class="recent-item__body">
                  <span class="recent-item__name">{{ f.vehicle }}</span>
                  <span class="recent-item__meta">{{ f.fileName }}</span>
                </div>
                <div class="recent-item__right">
                  <span class="recent-item__amount">{{ f.amount | currency:'TRY':'symbol':'1.0-0':'tr' }}</span>
                  <span class="status-chip" [class]="statusClass(f.status)">{{ f.status }}</span>
                </div>
              </div>
            }
          </div>
        </div>

      </div>

      <!-- QUICK ACTIONS -->
      <div class="ov__actions">
        <h2 class="ov__section-title">Hızlı Erişim</h2>
        <div class="quick-grid">
          @for (a of quickActions; track a.label) {
            <a [routerLink]="a.route" class="quick-card">
              <div class="quick-card__icon" [style.background]="a.color + '18'" [style.color]="a.color">
                <i [class]="'pi ' + a.icon"></i>
              </div>
              <span class="quick-card__label">{{ a.label }}</span>
              <span class="quick-card__desc">{{ a.desc }}</span>
              <i class="pi pi-arrow-right quick-card__arrow"></i>
            </a>
          }
        </div>
      </div>

    </div>
  `,
  styles: [`
    .ov { display: flex; flex-direction: column; gap: 2rem; }

    .ov__header {
      display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;
    }
    .ov__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .ov__sub { font-size: 0.9rem; color: rgba(255,255,255,0.45); margin: 0.25rem 0 0; }
    .ov__date { font-size: 0.8rem; color: rgba(255,255,255,0.35); padding-top: 0.5rem; }

    /* STATS */
    .ov__stats {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }
    .stat-card {
      background: #1a1d27;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 1.25rem;
      display: flex; align-items: flex-start; gap: 1rem;
      position: relative;
      transition: border-color 200ms;
    }
    .stat-card:hover { border-color: rgba(255,255,255,0.15); }
    .stat-card__icon {
      width: 44px; height: 44px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; flex-shrink: 0;
    }
    .stat-card__body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .stat-card__value { font-size: 1.4rem; font-weight: 700; color: #fff; line-height: 1; }
    .stat-card__label { font-size: 0.78rem; color: rgba(255,255,255,0.45); }
    .stat-card__trend {
      position: absolute; top: 1rem; right: 1rem;
      font-size: 0.7rem; font-weight: 600;
      display: flex; align-items: center; gap: 2px;
      background: rgba(255,255,255,0.06);
      padding: 2px 8px; border-radius: 20px;
    }
    .stat-card__trend--up { color: #4ade80; }
    .stat-card__trend--down { color: #f87171; }

    /* CARD */
    .dash-card {
      background: #1a1d27;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 1.5rem;
    }
    .dash-card__head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 1.25rem;
    }
    .dash-card__title { font-size: 1rem; font-weight: 600; color: #fff; margin: 0; }
    .dash-link { font-size: 0.8rem; color: #e63946; text-decoration: none; transition: opacity 180ms; }
    .dash-link:hover { opacity: 0.75; }

    /* CHART */
    .ov__grid {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 1.25rem;
    }
    @media (max-width: 900px) { .ov__grid { grid-template-columns: 1fr; } }

    .chart-legend { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: rgba(255,255,255,0.45); }
    .chart-legend__dot { width: 8px; height: 8px; border-radius: 50%; }
    .chart-wrap { width: 100%; overflow: hidden; }
    .bar-chart { width: 100%; height: 200px; display: block; }
    .chart-bar { transition: opacity 180ms; cursor: pointer; }
    .chart-bar:hover { opacity: 0.8; }

    /* RECENT LIST */
    .recent-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .recent-item {
      display: flex; align-items: center; gap: 0.875rem;
      padding: 0.75rem;
      border-radius: 10px;
      background: rgba(255,255,255,0.03);
      transition: background 180ms;
    }
    .recent-item:hover { background: rgba(255,255,255,0.06); }
    .recent-item__icon {
      width: 36px; height: 36px; border-radius: 8px;
      background: rgba(230,57,70,0.15); color: #e63946;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .recent-item__body { flex: 1; min-width: 0; }
    .recent-item__name { display: block; font-size: 0.82rem; font-weight: 600; color: rgba(255,255,255,0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .recent-item__meta { font-size: 0.7rem; color: rgba(255,255,255,0.35); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
    .recent-item__right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
    .recent-item__amount { font-size: 0.82rem; font-weight: 700; color: #fff; }

    .status-chip {
      font-size: 0.65rem; font-weight: 600;
      padding: 2px 8px; border-radius: 20px;
      white-space: nowrap;
    }
    .status--delivered { background: rgba(74,222,128,0.15); color: #4ade80; }
    .status--preparing { background: rgba(251,191,36,0.15); color: #fbbf24; }
    .status--review    { background: rgba(96,165,250,0.15); color: #60a5fa; }

    /* QUICK ACTIONS */
    .ov__section-title { font-size: 1rem; font-weight: 600; color: #fff; margin: 0 0 1rem; }
    .quick-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
    }
    .quick-card {
      background: #1a1d27;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 1.25rem;
      display: flex; flex-direction: column; gap: 0.5rem;
      text-decoration: none;
      transition: border-color 200ms, transform 200ms;
      position: relative;
    }
    .quick-card:hover { border-color: rgba(255,255,255,0.18); transform: translateY(-2px); }
    .quick-card__icon {
      width: 42px; height: 42px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; margin-bottom: 0.25rem;
    }
    .quick-card__label { font-size: 0.9rem; font-weight: 600; color: #fff; }
    .quick-card__desc { font-size: 0.75rem; color: rgba(255,255,255,0.4); }
    .quick-card__arrow {
      position: absolute; right: 1.25rem; top: 50%;
      transform: translateY(-50%);
      font-size: 0.75rem; color: rgba(255,255,255,0.25);
      transition: right 200ms, color 200ms;
    }
    .quick-card:hover .quick-card__arrow { right: 1rem; color: rgba(255,255,255,0.5); }
  `],
})
export class OverviewPage {
  protected readonly today = new Date();

  protected readonly stats = [
    { label: 'Toplam Dosya', value: '12', icon: 'pi-folder', color: '#e63946', trend: '+2 bu ay', trendUp: true },
    { label: 'Toplam Harcama', value: '₺8.450', icon: 'pi-wallet', color: '#60a5fa', trend: '+₺1.200', trendUp: true },
    { label: 'Aktif Lisans', value: '3', icon: 'pi-verified', color: '#4ade80', trend: '2 yenilendi', trendUp: true },
    { label: 'Bekleyen Sipariş', value: '1', icon: 'pi-clock', color: '#fbbf24', trend: 'Hazırlanıyor', trendUp: false },
  ];

  protected readonly monthStats: MonthStat[] = [
    { month: 'Oca', amount: 800, files: 1 },
    { month: 'Şub', amount: 1200, files: 2 },
    { month: 'Mar', amount: 600, files: 1 },
    { month: 'Nis', amount: 1800, files: 3 },
    { month: 'May', amount: 950, files: 2 },
    { month: 'Haz', amount: 1100, files: 2 },
    { month: 'Tem', amount: 0, files: 0 },
    { month: 'Ağu', amount: 0, files: 0 },
    { month: 'Eyl', amount: 0, files: 0 },
    { month: 'Eki', amount: 0, files: 0 },
    { month: 'Kas', amount: 0, files: 0 },
    { month: 'Ara', amount: 0, files: 0 },
  ];

  protected readonly recentFiles: TuningFile[] = [
    { id: '1', vehicle: 'BMW M3 F80', fileName: 'bmw_m3_f80_stage2.bin', type: 'Stage 2', date: new Date('2025-05-20'), amount: 1500, status: 'Teslim Edildi' },
    { id: '2', vehicle: 'Audi RS6 C8', fileName: 'audi_rs6_c8_pop_bang.bin', type: 'Pop & Bang', date: new Date('2025-05-15'), amount: 950, status: 'Teslim Edildi' },
    { id: '3', vehicle: 'VW Golf R Mk8', fileName: 'vw_golf_r_mk8_stage1.bin', type: 'Stage 1', date: new Date('2025-05-28'), amount: 750, status: 'Hazırlanıyor' },
  ];

  protected readonly quickActions = [
    { label: 'Chip Hesapla', desc: 'Aracınızın kazanımını hesaplayın', icon: 'pi-sliders-h', color: '#e63946', route: '/dashboard/tools' },
    { label: 'Dosyalarım', desc: 'Tüm tuning dosyalarını görüntüle', icon: 'pi-folder-open', color: '#60a5fa', route: '/dashboard/files' },
    { label: 'Destek Al', desc: 'Ekibimizle iletişime geç', icon: 'pi-headphones', color: '#4ade80', route: '/contact' },
  ];

  readonly barW = 36;
  readonly chartH = 175;
  readonly maxAmount = Math.max(...this.monthStats.map(m => m.amount), 1);
  readonly barSpacing = (600 - 48) / 12;

  readonly gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
    y: 10 + (1 - pct) * this.chartH,
    label: pct === 0 ? '' : `${Math.round(pct * this.maxAmount / 100) * 100}`,
  }));

  barX(i: number): number {
    return 52 + i * this.barSpacing + (this.barSpacing - this.barW) / 2;
  }
  barY(amount: number): number {
    return 10 + this.chartH - this.barH(amount);
  }
  barH(amount: number): number {
    return Math.max(2, (amount / this.maxAmount) * this.chartH);
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
