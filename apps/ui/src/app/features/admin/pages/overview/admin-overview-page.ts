import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService, AdminUserRow } from '../../../../core/admin/admin.service';
import { Order, OrdersService } from '../../../../core/orders/orders.service';
import { Ticket, TicketsService } from '../../../../core/tickets/tickets.service';
import { Statement } from '../../../../core/payments/payments.service';
import { PageLoader } from '../../../../shared/page-loader';
import { formatTl } from '../../../../core/orders/order-format';

const TR_MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function polyline(data: number[], W = 540, H = 100, padX = 20, padY = 10): string {
  const max = Math.max(1, ...data);
  return data.map((v, i) => {
    const x = padX + (data.length === 1 ? W / 2 : (i / (data.length - 1)) * W);
    const y = padY + H - (v / max) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function areaPath(data: number[], W = 540, H = 100, padX = 20, padY = 10): string {
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => ({
    x: padX + (data.length === 1 ? W / 2 : (i / (data.length - 1)) * W),
    y: padY + H - (v / max) * H,
  }));
  const bottom = padY + H;
  return `M${pts[0].x},${bottom} ` + pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ` L${pts[pts.length - 1].x},${bottom} Z`;
}

interface StatCard { label: string; value: string; icon: string; color: string; trend: string; up: boolean }
interface RecentOrderRow { id: string; orderNo: string; user: string; vehicle: string; status: string; statusKey: string; date: string }
interface OpenTicketRow { id: string; user: string; order: string; subject: string; status: string; statusKey: string; date: string }

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [RouterLink, DecimalPipe, PageLoader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="ao">
  <div class="ao__header">
    <h1 class="ao__title">Genel Bakış</h1>
    <p class="ao__sub">Sistem durumu ve özet istatistikler</p>
  </div>

  @if (loading()) {
    <app-page-loader />
  } @else {

  <!-- Stats — full width grid -->
  <div class="ao__stats">
    @for (s of stats(); track s.label) {
      <div class="ao-stat">
        <div class="ao-stat__icon" [style.background]="s.color + '18'" [style.color]="s.color">
          <i [class]="'pi ' + s.icon"></i>
        </div>
        <div class="ao-stat__body">
          <span class="ao-stat__val">{{ s.value }}</span>
          <span class="ao-stat__lbl">{{ s.label }}</span>
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
          <h2 class="ao-card__title">Aylık Kazanç (son 6 ay)</h2>
          <p class="ao-chart__val">{{ thisMonthRevenueText() }}
            <span class="ao-chart__badge" [class.ao-chart__badge--up]="revenueDeltaPct() >= 0" [class.ao-chart__badge--down]="revenueDeltaPct() < 0">
              <i class="pi" [class.pi-arrow-up]="revenueDeltaPct() >= 0" [class.pi-arrow-down]="revenueDeltaPct() < 0"></i>
              {{ revenueDeltaPct() > 0 ? '+' : '' }}{{ revenueDeltaPct() }}%
            </span>
          </p>
        </div>
        <div class="ao-card__legend">
          <span class="ao-legend-dot" style="background:#f59e0b"></span>
          <span>Bu yıl</span>
        </div>
      </div>
      <svg class="ao-svg" viewBox="0 0 580 130" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <line x1="20" y1="10" x2="560" y2="10" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <line x1="20" y1="43" x2="560" y2="43" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <line x1="20" y1="76" x2="560" y2="76" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <line x1="20" y1="110" x2="560" y2="110" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <path [attr.d]="revenueArea()" fill="url(#revGrad)"/>
        <polyline [attr.points]="revenuePoints()" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        @for (p of revenueDots(); track p.x) {
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4" fill="#f59e0b" stroke="#0d0f14" stroke-width="2"/>
        }
        @for (m of months(); track $index) {
          <text [attr.x]="20 + $index * 108" y="126" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">{{ m }}</text>
        }
      </svg>
    </div>

    <!-- Orders chart -->
    <div class="ao-card ao-card--chart">
      <div class="ao-card__head">
        <div>
          <h2 class="ao-card__title">Aylık İş Hacmi (son 6 ay)</h2>
          <p class="ao-chart__val">{{ thisMonthOrderCount() }} sipariş
            <span class="ao-chart__badge" [class.ao-chart__badge--up]="ordersDeltaPct() >= 0" [class.ao-chart__badge--down]="ordersDeltaPct() < 0">
              <i class="pi" [class.pi-arrow-up]="ordersDeltaPct() >= 0" [class.pi-arrow-down]="ordersDeltaPct() < 0"></i>
              {{ ordersDeltaPct() > 0 ? '+' : '' }}{{ ordersDeltaPct() }}%
            </span>
          </p>
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
        <line x1="20" y1="10" x2="560" y2="10" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <line x1="20" y1="43" x2="560" y2="43" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <line x1="20" y1="76" x2="560" y2="76" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <line x1="20" y1="110" x2="560" y2="110" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        @for (b of orderBars(); track b.x) {
          <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" rx="5" fill="rgba(96,165,250,0.18)" stroke="#60a5fa" stroke-width="1.5"/>
          <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="5" rx="3" fill="#60a5fa"/>
        }
        @for (b of orderBars(); track b.cx) {
          <text [attr.x]="b.cx" y="126" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">{{ months()[$index] }}</text>
        }
      </svg>
    </div>

  </div>

  <!-- This month summary -->
  <div class="ao__month-summary">
    <div class="ao-sum-item">
      <i class="pi pi-wallet"></i>
      <div>
        <p class="ao-sum-item__val">{{ thisMonthRevenueText() }}</p>
        <p class="ao-sum-item__lbl">Bu Ay Kazanç</p>
      </div>
    </div>
    <div class="ao-sum-divider"></div>
    <div class="ao-sum-item">
      <i class="pi pi-shopping-cart"></i>
      <div>
        <p class="ao-sum-item__val">{{ thisMonthOrderCount() }}</p>
        <p class="ao-sum-item__lbl">Bu Ay Sipariş</p>
      </div>
    </div>
    <div class="ao-sum-divider"></div>
    <div class="ao-sum-item">
      <i class="pi pi-check-circle"></i>
      <div>
        <p class="ao-sum-item__val">{{ thisMonthCompletedCount() }}</p>
        <p class="ao-sum-item__lbl">Tamamlanan</p>
      </div>
    </div>
    <div class="ao-sum-divider"></div>
    <div class="ao-sum-item">
      <i class="pi pi-clock"></i>
      <div>
        <p class="ao-sum-item__val">{{ pendingCount() }}</p>
        <p class="ao-sum-item__lbl">Bekleyen</p>
      </div>
    </div>
    <div class="ao-sum-divider"></div>
    <div class="ao-sum-item">
      <i class="pi pi-users"></i>
      <div>
        <p class="ao-sum-item__val">{{ newUsersThisMonth() }}</p>
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
      @if (recentOrders().length === 0) {
        <div class="ao-empty"><i class="pi pi-inbox"></i><p>Henüz sipariş yok</p></div>
      } @else {
        <table class="ao-table">
          <thead><tr>
            <th>Sipariş</th><th>Kullanıcı</th><th>Araç</th><th>Durum</th><th>Tarih</th>
          </tr></thead>
          <tbody>
            @for (o of recentOrders(); track o.id) {
              <tr>
                <td class="ao-table__id">{{ o.orderNo }}</td>
                <td>{{ o.user }}</td>
                <td>{{ o.vehicle }}</td>
                <td><span class="ao-badge ao-badge--{{ o.statusKey }}">{{ o.status }}</span></td>
                <td class="ao-table__date">{{ o.date }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <!-- Open Tickets -->
    <div class="ao-card">
      <div class="ao-card__head">
        <h2 class="ao-card__title">Açık Ticketlar</h2>
        <a routerLink="/admin/tickets" class="ao-card__link">Tümünü Gör →</a>
      </div>
      @if (openTickets().length === 0) {
        <div class="ao-empty"><i class="pi pi-check-circle"></i><p>Açık ticket yok</p></div>
      } @else {
        <div class="ao-ticket-list">
          @for (t of openTickets(); track t.id) {
            <div class="ao-tkt">
              <div class="ao-tkt__left">
                <span class="ao-badge ao-badge--{{ t.statusKey }}">{{ t.status }}</span>
                <div>
                  <p class="ao-tkt__subject">{{ t.subject }}</p>
                  <p class="ao-tkt__meta">{{ t.user }}{{ t.order ? ' · ' + t.order : '' }}</p>
                </div>
              </div>
              <span class="ao-tkt__date">{{ t.date }}</span>
            </div>
          }
        </div>
      }
    </div>
  </div>

  }
</div>
  `,
  styles: [`
    .ao { display: flex; flex-direction: column; gap: 1.5rem; }
    .ao__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .ao__sub { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }

    .ao__stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; }
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

    .ao__charts { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; @media(max-width:900px){ grid-template-columns: 1fr; } }
    .ao-card--chart { padding-bottom: 1rem; }
    .ao-svg { width: 100%; height: auto; min-height: 100px; display: block; overflow: visible; }
    .ao-chart__val { font-size: 1.1rem; font-weight: 700; color: #fff; margin: 0.15rem 0 0; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .ao-chart__badge { font-size: 0.65rem; font-weight: 700; display: inline-flex; align-items: center; gap: 2px; padding: 2px 6px; border-radius: 6px;
      &--up { background: rgba(74,222,128,0.12); color: #4ade80; }
      &--down { background: rgba(248,113,113,0.12); color: #f87171; }
      i { font-size: 0.55rem; }
    }
    .ao-card__legend { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: rgba(255,255,255,0.4); }
    .ao-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

    .ao__month-summary {
      background: linear-gradient(135deg, rgba(245,158,11,0.06), rgba(96,165,250,0.04));
      border: 1px solid rgba(245,158,11,0.15); border-radius: 16px;
      padding: 1rem 1.5rem; display: flex; align-items: center; gap: 0; flex-wrap: wrap;
    }
    .ao-sum-item { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 120px; padding: 0.5rem 1rem;
      i { font-size: 1.1rem; color: #f59e0b; flex-shrink: 0; }
      p { margin: 0; }
      &__val { font-size: 1rem; font-weight: 700; color: #fff; }
      &__lbl { font-size: 0.7rem; color: rgba(255,255,255,0.4); margin-top: 1px; }
    }
    .ao-sum-divider { width: 1px; height: 36px; background: rgba(255,255,255,0.07); flex-shrink: 0; }

    .ao__grid { display: grid; grid-template-columns: 1fr 380px; gap: 1.25rem; @media(max-width:1024px){ grid-template-columns: 1fr; } }

    .ao-card { background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 1.5rem;
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
      &--cancelled { background: rgba(248,113,113,0.12); color: #f87171; border: 1px solid rgba(248,113,113,0.2); }
      &--open      { background: rgba(251,191,36,0.12);  color: #fbbf24; border: 1px solid rgba(251,191,36,0.2);  }
      &--resolved  { background: rgba(74,222,128,0.12);  color: #4ade80; border: 1px solid rgba(74,222,128,0.2);  }
    }

    .ao-ticket-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .ao-tkt { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem;
      padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 10px;
      &__left { display: flex; align-items: flex-start; gap: 0.6rem; }
      &__subject { font-size: 0.8rem; font-weight: 600; color: #fff; margin: 0 0 2px; }
      &__meta { font-size: 0.7rem; color: rgba(255,255,255,0.3); margin: 0; }
      &__date { font-size: 0.68rem; color: rgba(255,255,255,0.25); flex-shrink: 0; margin-top: 2px; }
    }
    .ao-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 2rem 1rem; color: rgba(255,255,255,0.35); font-size: 0.82rem;
      i { font-size: 1.5rem; color: rgba(255,255,255,0.2); }
      p { margin: 0; }
    }
  `],
})
export class AdminOverviewPage implements OnInit {
  private readonly adminApi   = inject(AdminService);
  private readonly ordersApi  = inject(OrdersService);
  private readonly ticketsApi = inject(TicketsService);
  private readonly cdr        = inject(ChangeDetectorRef);

  protected readonly loading = signal(true);
  protected readonly users      = signal<AdminUserRow[]>([]);
  protected readonly orders     = signal<Order[]>([]);
  protected readonly tickets    = signal<Ticket[]>([]);
  protected readonly statements = signal<Statement[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      const [u, o, t, s] = await Promise.all([
        this.adminApi.listUsers(),
        this.ordersApi.adminListOrders(),
        this.ticketsApi.adminListTickets(),
        this.adminApi.listAllStatements(),
      ]);
      this.users.set(u);
      this.orders.set(o);
      this.tickets.set(t);
      this.statements.set(s);
    } catch { /* sessiz */ }
    finally { this.loading.set(false); this.cdr.markForCheck(); }
  }

  /* ─── Hesaplamalar ─── */

  private readonly now = new Date();

  /** Son 6 ayın (YIL-AY) anahtarlarını ve etiketlerini üretir, en eski → en yeni. */
  protected readonly months = computed<string[]>(() => this.lastSixMonths().map(m => TR_MONTHS_SHORT[m.month]));

  private lastSixMonths(): { year: number; month: number }[] {
    const out: { year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(this.now.getFullYear(), this.now.getMonth() - i, 1);
      out.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return out;
  }

  /**
   * Gelir kaynakları:
   *  - Kullanıcı (bireysel) siparişleri: peşin ödendiği için durum bağımsız sayılır,
   *    `createdAt` ait olduğu aya yazılır.
   *  - Bayi ödemeleri: bayi ekstresi `status='paid'` olduğunda `paidAt`/`updatedAt`
   *    ait olduğu aya, toplam tutar yazılır. Bireysel siparişlerin aksine sipariş
   *    durumundan bağımsız — bayi ödediği anda kazanç.
   */
  private readonly monthlyRevenue = computed<number[]>(() => {
    const buckets = this.lastSixMonths().map(() => 0);
    const start = new Date(this.now.getFullYear(), this.now.getMonth() - 5, 1);
    const idxFor = (d: Date) =>
      (d.getFullYear() - start.getFullYear()) * 12 + d.getMonth() - start.getMonth();

    // Bireysel kullanıcı siparişleri (peşin ödeme).
    for (const o of this.orders()) {
      if (o.customer?.role === 'dealer') { continue; }
      const d = new Date(o.createdAt);
      if (d < start) { continue; }
      const i = idxFor(d);
      if (i >= 0 && i < buckets.length) { buckets[i] += o.totalPrice; }
    }

    // Bayi ödemeleri (ekstre statüsü 'paid').
    for (const s of this.statements()) {
      if (s.status !== 'paid') { continue; }
      const paidIso = s.paidAt ?? s.dueDate;
      if (!paidIso) { continue; }
      const d = new Date(paidIso);
      if (d < start) { continue; }
      const i = idxFor(d);
      if (i >= 0 && i < buckets.length) { buckets[i] += s.total; }
    }
    return buckets;
  });

  /** Toplam tüm zamanların geliri (sipariş durumundan bağımsız). */
  private readonly totalRevenue = computed<number>(() => {
    const userOrders = this.orders()
      .filter(o => o.customer?.role !== 'dealer')
      .reduce((s, o) => s + o.totalPrice, 0);
    const dealerPaid = this.statements()
      .filter(s => s.status === 'paid')
      .reduce((s, st) => s + st.total, 0);
    return userOrders + dealerPaid;
  });

  /** Son 6 ay için sipariş sayısı (tüm sipariş statüleri). */
  private readonly monthlyOrders = computed<number[]>(() => {
    const buckets = this.lastSixMonths().map(() => 0);
    const start = new Date(this.now.getFullYear(), this.now.getMonth() - 5, 1);
    for (const o of this.orders()) {
      const d = new Date(o.createdAt);
      if (d < start) { continue; }
      const idx = (d.getFullYear() - start.getFullYear()) * 12 + d.getMonth() - start.getMonth();
      if (idx >= 0 && idx < buckets.length) { buckets[idx] += 1; }
    }
    return buckets;
  });

  protected readonly thisMonthRevenue = computed(() => this.monthlyRevenue()[5] ?? 0);
  protected readonly lastMonthRevenue = computed(() => this.monthlyRevenue()[4] ?? 0);
  protected readonly thisMonthOrderCount = computed(() => this.monthlyOrders()[5] ?? 0);
  protected readonly lastMonthOrderCount = computed(() => this.monthlyOrders()[4] ?? 0);

  protected readonly thisMonthRevenueText = computed(() => formatTl(this.thisMonthRevenue()));
  protected readonly revenueDeltaPct = computed(() => this.pctDelta(this.thisMonthRevenue(), this.lastMonthRevenue()));
  protected readonly ordersDeltaPct  = computed(() => this.pctDelta(this.thisMonthOrderCount(), this.lastMonthOrderCount()));

  private pctDelta(curr: number, prev: number): number {
    if (prev === 0) { return curr === 0 ? 0 : 100; }
    return Math.round(((curr - prev) / prev) * 100);
  }

  protected readonly thisMonthCompletedCount = computed(() => {
    const start = new Date(this.now.getFullYear(), this.now.getMonth(), 1);
    return this.orders().filter(o => o.status === 'completed' && new Date(o.createdAt) >= start).length;
  });
  protected readonly pendingCount = computed(() =>
    this.orders().filter(o => o.status === 'pending' || o.status === 'processing').length,
  );
  protected readonly newUsersThisMonth = computed(() => {
    const start = new Date(this.now.getFullYear(), this.now.getMonth(), 1);
    return this.users().filter(u => new Date(u.createdAt) >= start).length;
  });

  /* ─── Stat kartları ─── */
  protected readonly stats = computed<StatCard[]>(() => {
    const totalRevenue = this.totalRevenue();
    const dealers = this.users().filter(u => u.role === 'dealer' && u.status === 'approved').length;
    const openTickets = this.tickets().filter(t => t.status !== 'resolved').length;
    const fmtTl = (n: number) => {
      if (n >= 1_000_000) { return `₺${(n / 1_000_000).toFixed(1)}M`; }
      if (n >= 1_000)     { return `₺${Math.round(n / 1_000)}K`; }
      return formatTl(n);
    };
    return [
      { label: 'Toplam Kazanç',    value: fmtTl(totalRevenue),                  icon: 'pi-wallet',        color: '#4ade80', trend: '+' + fmtTl(this.thisMonthRevenue()) + ' bu ay', up: this.thisMonthRevenue() >= 0 },
      { label: 'Toplam Kullanıcı', value: String(this.users().length),          icon: 'pi-users',         color: '#60a5fa', trend: '+' + this.newUsersThisMonth() + ' bu ay', up: this.newUsersThisMonth() >= 0 },
      { label: 'Aktif Bayiler',    value: String(dealers),                      icon: 'pi-building',      color: '#f59e0b', trend: dealers + ' onaylı',                          up: true },
      { label: 'Toplam Sipariş',   value: String(this.orders().length),         icon: 'pi-shopping-cart', color: '#e63946', trend: '+' + this.thisMonthOrderCount() + ' bu ay',  up: true },
      { label: 'Açık Ticketlar',   value: String(openTickets),                  icon: 'pi-comments',      color: '#a78bfa', trend: openTickets + ' bekliyor',                    up: openTickets === 0 },
    ];
  });

  /* ─── Chart noktaları ─── */
  protected readonly revenuePoints = computed(() => polyline(this.monthlyRevenue()));
  protected readonly revenueArea   = computed(() => areaPath(this.monthlyRevenue()));
  protected readonly revenueDots   = computed<{ x: number; y: number }[]>(() => {
    const data = this.monthlyRevenue();
    const max = Math.max(1, ...data);
    return data.map((v, i) => ({
      x: parseFloat((20 + (data.length === 1 ? 270 : (i / (data.length - 1)) * 540)).toFixed(1)),
      y: parseFloat((10 + 100 - (v / max) * 100).toFixed(1)),
    }));
  });

  protected readonly orderBars = computed<{ x: number; y: number; w: number; h: number; cx: number }[]>(() => {
    const data = this.monthlyOrders();
    const max = Math.max(1, ...data);
    const barW = 40; const gap = 60; const padX = 20; const padY = 10; const H = 100;
    return data.map((v, i) => ({
      x:  padX + i * (barW + gap),
      y:  padY + H - (v / max) * H,
      w:  barW,
      h:  (v / max) * H,
      cx: padX + i * (barW + gap) + barW / 2,
    }));
  });

  /* ─── Listeler ─── */

  protected readonly recentOrders = computed<RecentOrderRow[]>(() =>
    this.orders().slice(0, 5).map(o => ({
      id: o.id,
      orderNo: o.orderNo,
      user: o.customer?.fullName ?? o.customer?.email ?? '—',
      vehicle: this.vehicleLabel(o),
      status: STATUS_LABEL[o.status] ?? o.status,
      statusKey: o.status,
      date: this.shortDate(o.createdAt),
    })),
  );

  protected readonly openTickets = computed<OpenTicketRow[]>(() =>
    this.tickets()
      .filter(t => t.status !== 'resolved')
      .slice(0, 3)
      .map(t => ({
        id: t.id,
        user: t.customer?.fullName ?? t.customer?.email ?? '—',
        order: t.orderLabel ?? t.orderNo ?? '',
        subject: t.subject,
        status: TICKET_STATUS_LABEL[t.status] ?? t.status,
        statusKey: t.status,
        date: this.shortDate(t.createdAt),
      })),
  );

  /* ─── Helpers ─── */

  private vehicleLabel(o: Order): string {
    const parts = [o.make, o.model].filter(Boolean).join(' ');
    const stage = STAGE_LABEL[o.stage] ?? o.stage;
    return parts ? `${parts} ${stage}` : stage;
  }

  private shortDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) { return ''; }
    return `${d.getDate()} ${TR_MONTHS_SHORT[d.getMonth()]}`;
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Beklemede', processing: 'İşlemde', completed: 'Tamamlandı', cancelled: 'İptal',
};
const STAGE_LABEL: Record<string, string> = {
  stage1: 'Stage 1', stage2: 'Stage 2', stage3: 'Stage 3',
};
const TICKET_STATUS_LABEL: Record<string, string> = {
  open: 'Açık', pending: 'Beklemede', resolved: 'Çözüldü',
};
