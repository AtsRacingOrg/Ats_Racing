import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

const MONTHS = ['Ara', 'Oca', 'Şub', 'Mar', 'Nis', 'May'];
const REVENUE = [45000, 52000, 48000, 61000, 57000, 73000];
const ORDERS  = [38, 42, 35, 51, 47, 61];

function polyline(data: number[], W = 540, H = 100, padX = 20, padY = 10): string {
  const max = Math.max(...data);
  return data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * W;
    const y = padY + H - (v / max) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function areaPath(data: number[], W = 540, H = 100, padX = 20, padY = 10): string {
  const max = Math.max(...data);
  const pts = data.map((v, i) => ({ x: padX + (i / (data.length - 1)) * W, y: padY + H - (v / max) * H }));
  const bottom = padY + H;
  return `M${pts[0].x},${bottom} ` + pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ` L${pts[pts.length - 1].x},${bottom} Z`;
}

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="ao">
  <div class="ao__header">
    <h1 class="ao__title">Genel Bakış</h1>
    <p class="ao__sub">Sistem durumu ve özet istatistikler</p>
  </div>

  <!-- Stats — full width grid -->
  <div class="ao__stats">
    @for (s of stats; track s.label) {
      <div class="ao-stat">
        <div class="ao-stat__icon" [style.background]="s.color + '18'" [style.color]="s.color">
          <i [class]="'pi ' + s.icon"></i>
        </div>
        <div class="ao-stat__body">
          <span class="ao-stat__val">{{ s.value }}</span>
          <span class="ao-stat__lbl">{{ s.label }}</span>
        </div>
        <div class="ao-stat__right">
          <span class="ao-stat__trend" [class.ao-stat__trend--up]="s.up" [class.ao-stat__trend--down]="!s.up">
            <i [class]="'pi ' + (s.up ? 'pi-arrow-up' : 'pi-arrow-down')"></i> {{ s.trend }}
          </span>
        </div>
      </div>
    }
  </div>

  <!-- Charts row -->
  <div class="ao__charts">

    <!-- Revenue chart -->
    <div class="ao-card ao-card--chart">
      <div class="ao-card__head">
        <div>
          <h2 class="ao-card__title">Aylık Kazanç</h2>
          <p class="ao-chart__val">₺73.000 <span class="ao-chart__badge ao-chart__badge--up"><i class="pi pi-arrow-up"></i> +28%</span></p>
        </div>
        <div class="ao-card__legend">
          <span class="ao-legend-dot" style="background:#f59e0b"></span>
          <span>2026</span>
        </div>
      </div>
      <svg class="ao-svg" viewBox="0 0 580 130" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <!-- Grid lines -->
        <line x1="20" y1="10" x2="560" y2="10" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <line x1="20" y1="43" x2="560" y2="43" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <line x1="20" y1="76" x2="560" y2="76" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <line x1="20" y1="110" x2="560" y2="110" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <!-- Area fill -->
        <path [attr.d]="revenueArea" fill="url(#revGrad)"/>
        <!-- Line -->
        <polyline [attr.points]="revenuePoints" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Dots -->
        @for (p of revenueDots; track p.x) {
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4" fill="#f59e0b" stroke="#0d0f14" stroke-width="2"/>
        }
        <!-- Month labels -->
        @for (m of months; track $index) {
          <text [attr.x]="20 + $index * 108" y="126" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">{{ m }}</text>
        }
      </svg>
    </div>

    <!-- Orders chart -->
    <div class="ao-card ao-card--chart">
      <div class="ao-card__head">
        <div>
          <h2 class="ao-card__title">Aylık İş Hacmi</h2>
          <p class="ao-chart__val">61 sipariş <span class="ao-chart__badge ao-chart__badge--up"><i class="pi pi-arrow-up"></i> +30%</span></p>
        </div>
        <div class="ao-card__legend">
          <span class="ao-legend-dot" style="background:#60a5fa"></span>
          <span>Sipariş</span>
        </div>
      </div>
      <svg class="ao-svg" viewBox="0 0 580 130" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#60a5fa" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <!-- Grid lines -->
        <line x1="20" y1="10" x2="560" y2="10" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <line x1="20" y1="43" x2="560" y2="43" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <line x1="20" y1="76" x2="560" y2="76" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <line x1="20" y1="110" x2="560" y2="110" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <!-- Bars -->
        @for (b of orderBars; track b.x) {
          <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h"
            rx="5" fill="rgba(96,165,250,0.18)" stroke="#60a5fa" stroke-width="1.5"/>
          <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="5"
            rx="3" fill="#60a5fa"/>
        }
        <!-- Month labels -->
        @for (b of orderBars; track b.cx) {
          <text [attr.x]="b.cx" y="126" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">{{ months[$index] }}</text>
        }
      </svg>
    </div>

  </div>

  <!-- This month summary -->
  <div class="ao__month-summary">
    <div class="ao-sum-item">
      <i class="pi pi-wallet"></i>
      <div>
        <p class="ao-sum-item__val">₺73.000</p>
        <p class="ao-sum-item__lbl">Bu Ay Kazanç</p>
      </div>
    </div>
    <div class="ao-sum-divider"></div>
    <div class="ao-sum-item">
      <i class="pi pi-shopping-cart"></i>
      <div>
        <p class="ao-sum-item__val">61</p>
        <p class="ao-sum-item__lbl">Bu Ay Sipariş</p>
      </div>
    </div>
    <div class="ao-sum-divider"></div>
    <div class="ao-sum-item">
      <i class="pi pi-check-circle"></i>
      <div>
        <p class="ao-sum-item__val">54</p>
        <p class="ao-sum-item__lbl">Tamamlanan</p>
      </div>
    </div>
    <div class="ao-sum-divider"></div>
    <div class="ao-sum-item">
      <i class="pi pi-clock"></i>
      <div>
        <p class="ao-sum-item__val">7</p>
        <p class="ao-sum-item__lbl">Bekleyen</p>
      </div>
    </div>
    <div class="ao-sum-divider"></div>
    <div class="ao-sum-item">
      <i class="pi pi-users"></i>
      <div>
        <p class="ao-sum-item__val">12</p>
        <p class="ao-sum-item__lbl">Yeni Üye</p>
      </div>
    </div>
  </div>

  <div class="ao__grid">
    <!-- Recent Orders -->
    <div class="ao-card">
      <div class="ao-card__head">
        <h2 class="ao-card__title">Son Siparişler</h2>
        <a routerLink="/admin/orders" class="ao-card__link">Tümünü Gör →</a>
      </div>
      <table class="ao-table">
        <thead><tr>
          <th>Sipariş</th><th>Kullanıcı</th><th>Araç</th><th>Durum</th><th>Tarih</th>
        </tr></thead>
        <tbody>
          @for (o of recentOrders; track o.id) {
            <tr>
              <td class="ao-table__id">{{ o.id }}</td>
              <td>{{ o.user }}</td>
              <td>{{ o.vehicle }}</td>
              <td><span class="ao-badge ao-badge--{{ o.statusKey }}">{{ o.status }}</span></td>
              <td class="ao-table__date">{{ o.date }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Open Tickets -->
    <div class="ao-card">
      <div class="ao-card__head">
        <h2 class="ao-card__title">Açık Ticketlar</h2>
        <a routerLink="/admin/tickets" class="ao-card__link">Tümünü Gör →</a>
      </div>
      <div class="ao-ticket-list">
        @for (t of openTickets; track t.id) {
          <div class="ao-tkt">
            <div class="ao-tkt__left">
              <span class="ao-badge ao-badge--{{ t.statusKey }}">{{ t.status }}</span>
              <div>
                <p class="ao-tkt__subject">{{ t.subject }}</p>
                <p class="ao-tkt__meta">{{ t.user }} · {{ t.order }}</p>
              </div>
            </div>
            <span class="ao-tkt__date">{{ t.date }}</span>
          </div>
        }
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    .ao { display: flex; flex-direction: column; gap: 1.5rem; }
    .ao__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .ao__sub { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }

    /* ── Stats — 5 equal columns ── */
    .ao__stats {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1rem;
    }
    @media (max-width: 1280px) { .ao__stats { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 900px)  { .ao__stats { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px)  { .ao__stats { grid-template-columns: 1fr; } }

    .ao-stat {
      background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px;
      padding: 1.25rem 1.5rem; display: flex; align-items: center; gap: 1rem;
      &__icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; i { font-size: 1.3rem; } }
      &__body { display: flex; flex-direction: column; flex: 1; min-width: 0; }
      &__val { font-size: 1.7rem; font-weight: 800; color: #fff; line-height: 1; }
      &__lbl { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 4px; }
      &__right { margin-left: auto; flex-shrink: 0; }
      &__trend { font-size: 0.7rem; font-weight: 600; display: flex; align-items: center; gap: 2px;
        &--up { color: #4ade80; } &--down { color: #f87171; }
        i { font-size: 0.6rem; }
      }
    }

    /* ── Charts ── */
    .ao__charts { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; @media(max-width:900px){ grid-template-columns: 1fr; } }
    .ao-card--chart { padding-bottom: 1rem; }

    .ao-svg { width: 100%; height: auto; min-height: 100px; display: block; overflow: visible; }

    .ao-chart__val { font-size: 1.1rem; font-weight: 700; color: #fff; margin: 0.15rem 0 0; display: flex; align-items: center; gap: 0.5rem; }
    .ao-chart__badge { font-size: 0.65rem; font-weight: 700; display: inline-flex; align-items: center; gap: 2px; padding: 2px 6px; border-radius: 6px;
      &--up { background: rgba(74,222,128,0.12); color: #4ade80; }
      &--down { background: rgba(248,113,113,0.12); color: #f87171; }
      i { font-size: 0.55rem; }
    }
    .ao-card__legend { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: rgba(255,255,255,0.4); }
    .ao-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

    /* ── Month summary strip ── */
    .ao__month-summary {
      background: linear-gradient(135deg, rgba(245,158,11,0.06), rgba(96,165,250,0.04));
      border: 1px solid rgba(245,158,11,0.15); border-radius: 16px;
      padding: 1rem 1.5rem; display: flex; align-items: center; gap: 0; flex-wrap: wrap;
    }
    .ao-sum-item {
      display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 120px; padding: 0.5rem 1rem;
      i { font-size: 1.1rem; color: #f59e0b; flex-shrink: 0; }
      p { margin: 0; }
      &__val { font-size: 1rem; font-weight: 700; color: #fff; }
      &__lbl { font-size: 0.7rem; color: rgba(255,255,255,0.4); margin-top: 1px; }
    }
    .ao-sum-divider { width: 1px; height: 36px; background: rgba(255,255,255,0.07); flex-shrink: 0; }

    /* ── Bottom grid ── */
    .ao__grid { display: grid; grid-template-columns: 1fr 380px; gap: 1.25rem; @media(max-width:1024px){ grid-template-columns: 1fr; } }

    .ao-card {
      background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 1.5rem;
      &__head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.5rem; }
      &__title { font-size: 0.9rem; font-weight: 700; color: #fff; margin: 0; }
      &__link { font-size: 0.75rem; color: #f59e0b; text-decoration: none; &:hover { opacity: 0.8; } }
    }

    .ao-table { width: 100%; border-collapse: collapse; font-size: 0.8rem;
      th { color: rgba(255,255,255,0.3); font-weight: 600; text-transform: uppercase; font-size: 0.65rem; letter-spacing: .05em; padding: 0 0 0.75rem; text-align: left; }
      td { padding: 0.65rem 0; border-top: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.75); vertical-align: middle; }
      &__id { color: #f59e0b; font-weight: 700; font-family: monospace; }
      &__date { color: rgba(255,255,255,0.3); }
    }

    .ao-badge {
      display: inline-flex; padding: 0.18rem 0.55rem; border-radius: 6px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
      &--pending   { background: rgba(251,191,36,0.12);  color: #fbbf24; border: 1px solid rgba(251,191,36,0.2);  }
      &--processing{ background: rgba(96,165,250,0.12);  color: #60a5fa; border: 1px solid rgba(96,165,250,0.2);  }
      &--completed { background: rgba(74,222,128,0.12);  color: #4ade80; border: 1px solid rgba(74,222,128,0.2);  }
      &--open      { background: rgba(251,191,36,0.12);  color: #fbbf24; border: 1px solid rgba(251,191,36,0.2);  }
      &--resolved  { background: rgba(74,222,128,0.12);  color: #4ade80; border: 1px solid rgba(74,222,128,0.2);  }
    }

    .ao-ticket-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .ao-tkt {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem;
      padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 10px;
      &__left { display: flex; align-items: flex-start; gap: 0.6rem; }
      &__subject { font-size: 0.8rem; font-weight: 600; color: #fff; margin: 0 0 2px; }
      &__meta { font-size: 0.7rem; color: rgba(255,255,255,0.3); margin: 0; }
      &__date { font-size: 0.68rem; color: rgba(255,255,255,0.25); flex-shrink: 0; margin-top: 2px; }
    }
  `],
})
export class AdminOverviewPage {
  protected readonly months = MONTHS;

  // Revenue line chart
  protected readonly revenuePoints = polyline(REVENUE);
  protected readonly revenueArea   = areaPath(REVENUE);
  protected readonly revenueDots: { x: number; y: number }[] = REVENUE.map((v, i) => ({
    x: parseFloat((20 + (i / (REVENUE.length - 1)) * 540).toFixed(1)),
    y: parseFloat((10 + 100 - (v / Math.max(...REVENUE)) * 100).toFixed(1)),
  }));

  // Orders bar chart — barW=40, gap=60, padX=20 → 6 bars fit within 580px viewBox
  protected readonly orderBars: { x: number; y: number; w: number; h: number; cx: number }[] = (() => {
    const max = Math.max(...ORDERS); const barW = 40; const gap = 60; const padX = 20; const padY = 10; const H = 100;
    return ORDERS.map((v, i) => ({
      x:  padX + i * (barW + gap),
      y:  padY + H - (v / max) * H,
      w:  barW,
      h:  (v / max) * H,
      cx: padX + i * (barW + gap) + barW / 2,   // bar centre for label
    }));
  })();

  protected readonly stats = [
    { label: 'Toplam Kazanç',    value: '₺847K', icon: 'pi-wallet',        color: '#4ade80', trend: '+₺73K bu ay', up: true },
    { label: 'Toplam Kullanıcı', value: '248',   icon: 'pi-users',         color: '#60a5fa', trend: '+12 bu ay',   up: true },
    { label: 'Aktif Bayiler',    value: '18',    icon: 'pi-building',      color: '#f59e0b', trend: '+2 bu ay',    up: true },
    { label: 'Toplam Sipariş',   value: '1.240', icon: 'pi-shopping-cart', color: '#e63946', trend: '+61 bu ay',   up: true },
    { label: 'Açık Ticketlar',   value: '7',     icon: 'pi-comments',      color: '#a78bfa', trend: '-3 bu hafta', up: false },
  ];

  protected readonly recentOrders = [
    { id: 'ORD-048', user: 'Ali Yıldız',    vehicle: 'BMW M3 G80 Stage 1',   status: 'Beklemede',  statusKey: 'pending',    date: '29 May' },
    { id: 'ORD-047', user: 'Mert Kaya',     vehicle: 'Audi RS6 Stage 2',     status: 'İşlemde',    statusKey: 'processing', date: '28 May' },
    { id: 'ORD-046', user: 'Selin Demir',   vehicle: 'VW Golf R Stage 1',    status: 'Tamamlandı', statusKey: 'completed',  date: '27 May' },
    { id: 'ORD-045', user: 'Emre Şahin',    vehicle: 'Porsche 911 Stage 3',  status: 'Tamamlandı', statusKey: 'completed',  date: '26 May' },
    { id: 'ORD-044', user: 'Zeynep Arslan', vehicle: 'Mercedes C63 Stage 2', status: 'İşlemde',    statusKey: 'processing', date: '25 May' },
  ];

  protected readonly openTickets = [
    { id: 'TKT-003', user: 'Ali Yıldız', order: 'ORD-003', subject: 'DPF ışığı hala yanıyor',            status: 'Açık',      statusKey: 'open',    date: '18 Mar' },
    { id: 'TKT-001', user: 'Ali Yıldız', order: 'ORD-001', subject: 'Yazılım sonrası rölantide titreme', status: 'Beklemede', statusKey: 'pending', date: '12 May' },
    { id: 'TKT-005', user: 'Mert Kaya',  order: 'ORD-047', subject: 'Stage 2 sonrası DTC kodları',       status: 'Açık',      statusKey: 'open',    date: '28 May' },
  ];
}
