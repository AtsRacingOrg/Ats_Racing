import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { PageLoader } from '../../../../shared/page-loader';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { Order, OrdersService } from '../../../../core/orders/orders.service';
import { TicketsService } from '../../../../core/tickets/tickets.service';
import { PaymentsService } from '../../../../core/payments/payments.service';
import { stageLabel, formatTl } from '../../../../core/orders/order-format';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { I18nService } from '../../../../core/i18n/i18n.service';

interface MonthStat {
  month: string;
  amount: number;
}

@Component({
  selector: 'app-overview-page',
  standalone: true,
  imports: [DecimalPipe, RouterLink, PageLoader, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) { <app-page-loader /> } @else {
<div class="ov">

      <!-- PAGE HEADER -->
      <div class="ov__header">
        <div>
          <h1 class="ov__title">{{ 'ov.title' | t }}</h1>
          <p class="ov__sub">{{ 'ov.welcome' | t:{ name: firstName() } }}</p>
        </div>
        <span class="ov__date">{{ todayLabel() }}</span>
      </div>

      <!-- STAT CARDS -->
      <div class="ov__stats">
        @for (s of stats(); track s.label) {
          <div class="stat-card">
            <div class="stat-card__top">
              <div class="stat-card__icon" [style.background]="s.color + '1a'" [style.color]="s.color">
                <i [class]="'pi ' + s.icon"></i>
              </div>
              <span class="stat-card__value">{{ s.value }}</span>
            </div>
            <div class="stat-card__bottom">
              <span class="stat-card__label">{{ s.label }}</span>
            </div>
          </div>
        }
      </div>

      <!-- CHART + RECENT -->
      <div class="ov__grid">

        <!-- SVG BAR CHART -->
        <div class="dash-card">
          <div class="dash-card__head">
            <h2 class="dash-card__title">{{ 'ov.monthlySpend' | t }}</h2>
            <div class="chart-legend">
              <span class="chart-legend__dot" style="background:#e63946"></span> {{ 'ov.spendLegend' | t }}
            </div>
          </div>
          <div class="chart-wrap">
            <!-- Bars SVG — preserveAspectRatio="none" only on visual shapes, text is in HTML below -->
            <svg viewBox="0 0 600 185" preserveAspectRatio="none" class="bar-chart" aria-hidden="true">
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#e63946"></stop>
                  <stop offset="100%" stop-color="#c1121f" stop-opacity="0.6"></stop>
                </linearGradient>
              </defs>
              <!-- Grid lines + Y labels -->
              @for (line of gridLines(); track line.y) {
                <line
                  [attr.x1]="48" [attr.y1]="line.y"
                  [attr.x2]="590" [attr.y2]="line.y"
                  stroke="rgba(255,255,255,0.06)" stroke-width="1"
                ></line>
                <text [attr.x]="40" [attr.y]="line.y + 4" text-anchor="end" fill="rgba(255,255,255,0.3)" font-size="9">
                  {{ line.label }}
                </text>
              }
              <!-- Bars only — no month labels here -->
              @for (m of monthStats(); track m.month; let i = $index) {
                <rect
                  [attr.x]="barX(i)"
                  [attr.y]="barY(m.amount)"
                  [attr.width]="barW"
                  [attr.height]="barH(m.amount)"
                  rx="4"
                  fill="url(#barGrad)"
                  class="chart-bar"
                >
                  <title>{{ m.month }}: ₺{{ m.amount | number:'1.0-0' }}</title>
                </rect>
              }
            </svg>
            <!-- Month labels as HTML — never distorted -->
            <div class="bar-months">
              @for (m of monthStats(); track m.month) {
                <span>{{ m.month }}</span>
              }
            </div>
          </div>
        </div>

        <!-- RECENT ORDERS -->
        <div class="dash-card">
          <div class="dash-card__head">
            <h2 class="dash-card__title">{{ 'ov.recentOrders' | t }}</h2>
            <a routerLink="/dashboard/orders" class="dash-link">{{ 'ov.viewAll' | t }}</a>
          </div>
          <div class="recent-list">
            @if (recentOrders().length === 0) {
              <div class="recent-empty"><i class="pi pi-inbox"></i><span>{{ 'ov.noOrders' | t }}</span></div>
            }
            @for (o of recentOrders(); track o.id) {
              <div class="recent-item">
                <div class="recent-item__icon">
                  <i class="pi pi-car"></i>
                </div>
                <div class="recent-item__body">
                  <span class="recent-item__name">{{ vehicleOf(o) }}</span>
                  <span class="recent-item__meta">{{ o.orderNo }} · {{ stageLabel(o.stage) }}</span>
                </div>
                <div class="recent-item__right">
                  <span class="recent-item__amount">₺{{ o.totalPrice | number:'1.0-0' }}</span>
                  <span [class]="orderStatusClass(o.status)">{{ orderStatusLabel(o.status) }}</span>
                </div>
              </div>
            }
          </div>
        </div>

      </div>

      <!-- QUICK ACTIONS -->
      <div class="ov__actions">
        <h2 class="ov__section-title">{{ 'ov.quickAccess' | t }}</h2>
        <div class="quick-grid">
          @for (a of quickActions; track a.labelKey) {
            <a [routerLink]="a.route" class="quick-card">
              <div class="quick-card__icon" [style.background]="a.color + '18'" [style.color]="a.color">
                <i [class]="'pi ' + a.icon"></i>
              </div>
              <span class="quick-card__label">{{ a.labelKey | t }}</span>
              <span class="quick-card__desc">{{ a.descKey | t }}</span>
              <i class="pi pi-arrow-right quick-card__arrow"></i>
            </a>
          }
        </div>
      </div>

    </div>
}
  `,
  styles: [`
    .ov { display: flex; flex-direction: column; gap: 2rem; }

    .ov__header {
      display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;
    }
    .ov__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .ov__sub { font-size: 0.9rem; color: rgba(255,255,255,0.45); margin: 0.25rem 0 0; }
    .ov__date { font-size: 0.8rem; color: rgba(255,255,255,0.35); padding-top: 0.5rem; }

    /* STATS — always 4 equal columns */
    .ov__stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }
    @media (max-width: 900px) { .ov__stats { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px) { .ov__stats { grid-template-columns: 1fr; } }
    .stat-card {
      background: #1a1d27;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 1.25rem 1.25rem 1rem;
      display: flex; flex-direction: column; gap: 0.875rem;
      transition: border-color 200ms;
    }
    .stat-card:hover { border-color: rgba(255,255,255,0.15); }
    .stat-card__top {
      display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
    }
    .stat-card__bottom {
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
    }
    .stat-card__icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; flex-shrink: 0;
    }
    .stat-card__value { font-size: 1.5rem; font-weight: 800; color: #fff; line-height: 1; }
    .stat-card__label { font-size: 0.78rem; color: rgba(255,255,255,0.45); }
    .stat-card__trend {
      font-size: 0.68rem; font-weight: 700;
      display: flex; align-items: center; gap: 3px;
      background: rgba(255,255,255,0.06);
      padding: 3px 8px; border-radius: 20px;
      white-space: nowrap;
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
    .bar-chart { width: 100%; height: 175px; display: block; }
    .chart-bar { transition: opacity 180ms; cursor: pointer; }
    .chart-bar:hover { opacity: 0.8; }
    .bar-months {
      display: flex; justify-content: space-around;
      padding: 4px 0 0;
      font-size: 0.68rem; color: rgba(255,255,255,0.38);
    }
    .bar-months span { flex: 1; text-align: center; }

    /* RECENT LIST */
    .recent-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .recent-empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem; color: rgba(255,255,255,0.3); font-size: 0.82rem; i { font-size: 1.5rem; } }
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
export class OverviewPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly ordersApi = inject(OrdersService);
  private readonly ticketsApi = inject(TicketsService);
  private readonly paymentsApi = inject(PaymentsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly i18n = inject(I18nService);

  protected readonly today = new Date();
  protected readonly isDealer = this.auth.isDealer;

  protected readonly loading = signal(true);
  private readonly orders = signal<Order[]>([]);
  private readonly openTicketCount = signal(0);
  private readonly pendingPayment = signal(0);

  protected readonly firstName = computed(() =>
    this.auth.currentUser()?.name?.trim().split(/\s+/)[0] ?? '',
  );

  /** Dile göre tarih (ör. 4 Haz 2026 / 4 Jun 2026). */
  protected readonly todayLabel = computed(() => {
    const d = this.today;
    return `${d.getDate()} ${this.i18n.t(`mon.${d.getMonth()}`)} ${d.getFullYear()}`;
  });

  ngOnInit(): void {
    // Cache'ten anında doldur, arka planda tazele.
    const cachedOrders = this.ordersApi.peekMyOrders();
    if (cachedOrders) { this.orders.set(cachedOrders); this.loading.set(false); }

    void this.load(!!cachedOrders);
  }

  private async load(hasCache: boolean): Promise<void> {
    try {
      const [orders, tickets] = await Promise.all([
        this.ordersApi.listMyOrders(),
        this.ticketsApi.listMyTickets(),
      ]);
      this.orders.set(orders);
      this.openTicketCount.set(tickets.filter(t => t.status !== 'resolved').length);
      if (this.isDealer()) {
        const statements = await this.paymentsApi.listStatements();
        this.pendingPayment.set(
          statements.filter(s => s.status !== 'paid').reduce((sum, s) => sum + s.total, 0),
        );
      }
    } catch { /* sessiz */ }
    finally { if (!hasCache) { this.loading.set(false); } this.cdr.markForCheck(); }
  }

  /* ── Türetilen istatistikler ── */
  protected readonly stats = computed(() => {
    const os = this.orders();
    const completed = os.filter(o => o.status === 'completed').length;
    const cards = [
      { label: this.i18n.t('ov.stat.totalOrders'), value: String(os.length), icon: 'pi-shopping-cart', color: '#e63946' },
      { label: this.i18n.t('ov.stat.completed'), value: String(completed), icon: 'pi-check-circle', color: '#4ade80' },
      { label: this.i18n.t('ov.stat.openTickets'), value: String(this.openTicketCount()), icon: 'pi-comments', color: '#60a5fa' },
    ];
    if (this.isDealer()) {
      cards.push({ label: this.i18n.t('ov.stat.pendingPayment'), value: formatTl(this.pendingPayment()), icon: 'pi-wallet', color: '#fbbf24' });
    } else {
      // İptal edilen siparişler iade edildiği için harcamaya dahil edilmez.
      const total = os.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.totalPrice, 0);
      cards.push({ label: this.i18n.t('ov.stat.totalSpend'), value: formatTl(total), icon: 'pi-wallet', color: '#fbbf24' });
    }
    return cards;
  });

  protected readonly monthStats = computed<MonthStat[]>(() => {
    const months = Array.from({ length: 12 }, (_, i) => this.i18n.t(`mon.${i}`));
    const arr = months.map(m => ({ month: m, amount: 0 }));
    const yr = new Date().getFullYear();
    for (const o of this.orders()) {
      if (o.status === 'cancelled') { continue; }
      const d = new Date(o.createdAt);
      if (d.getFullYear() === yr) { arr[d.getMonth()].amount += o.totalPrice; }
    }
    return arr;
  });

  protected readonly recentOrders = computed(() => this.orders().slice(0, 3));

  protected readonly quickActions = [
    { labelKey: 'ov.qa.chip', descKey: 'ov.qa.chipDesc', icon: 'pi-sliders-h', color: '#e63946', route: '/dashboard/tools' },
    { labelKey: 'ov.qa.orders', descKey: 'ov.qa.ordersDesc', icon: 'pi-shopping-cart', color: '#60a5fa', route: '/dashboard/orders' },
    { labelKey: 'ov.qa.support', descKey: 'ov.qa.supportDesc', icon: 'pi-headphones', color: '#4ade80', route: '/dashboard/support' },
  ];

  readonly barW = 36;
  readonly chartH = 175;
  readonly barSpacing = (600 - 48) / 12;

  protected readonly maxAmount = computed(() => Math.max(...this.monthStats().map(m => m.amount), 1));
  protected readonly gridLines = computed(() =>
    [0, 0.25, 0.5, 0.75, 1].map(pct => ({
      y: 10 + (1 - pct) * this.chartH,
      label: pct === 0 ? '' : `${Math.round(pct * this.maxAmount() / 100) * 100}`,
    })),
  );

  barX(i: number): number {
    return 52 + i * this.barSpacing + (this.barSpacing - this.barW) / 2;
  }
  barY(amount: number): number {
    return 10 + this.chartH - this.barH(amount);
  }
  barH(amount: number): number {
    return Math.max(2, (amount / this.maxAmount()) * this.chartH);
  }

  vehicleOf(o: Order): string {
    return [o.make, o.model].filter(Boolean).join(' ') || this.i18n.t('common.vehicle');
  }
  orderStatusLabel(s: string): string {
    const map: Record<string, string> = {
      pending: 'status.pending', processing: 'status.processing',
      completed: 'status.completed', cancelled: 'status.cancelled',
    };
    return map[s] ? this.i18n.t(map[s]) : s;
  }
  orderStatusClass(s: string): string {
    const map: Record<string, string> = {
      pending: 'status-chip status--review', processing: 'status-chip status--preparing',
      completed: 'status-chip status--delivered', cancelled: 'status-chip status--review',
    };
    return map[s] ?? 'status-chip';
  }
  stageLabel = stageLabel;
}
