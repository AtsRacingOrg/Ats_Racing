import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { PageLoader } from '../../../../shared/page-loader';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { PaymentsService, Statement } from '../../../../core/payments/payments.service';
import { periodLabel, stageLabel, formatTrDate } from '../../../../core/orders/order-format';

type DebtStatus = 'accruing' | 'due' | 'paid' | 'overdue';

interface DebtOrder {
  id: string;
  date: string;
  vehicle: string;
  service: string;
  amount: number;
}

interface MonthlyStatement {
  id: string;
  /** Hangi ayın siparişleri (ör. "Mayıs 2026"). */
  period: string;
  /** Ödeme tarihi — bir sonraki ayın 1'i. */
  dueDate: string;
  status: DebtStatus;
  orders: DebtOrder[];
  paidAt?: string;
}

const STATUS_META: Record<DebtStatus, { label: string; }> = {
  accruing: { label: 'Birikiyor' },
  due:      { label: 'Ödeme Bekliyor' },
  paid:     { label: 'Ödendi' },
  overdue:  { label: 'Gecikmiş' },
};

/** API Statement → ekran modeli (MonthlyStatement). */
function mapStatement(s: Statement): MonthlyStatement {
  return {
    id: s.statementNo,
    period: periodLabel(s.periodYear, s.periodMonth),
    dueDate: formatTrDate(s.dueDate),
    status: s.status,
    paidAt: s.paidAt ? formatTrDate(s.paidAt) : undefined,
    orders: s.orders.map(o => ({
      id: o.orderNo,
      date: formatTrDate(o.createdAt),
      vehicle: [o.make, o.model].filter(Boolean).join(' '),
      service: stageLabel(o.stage),
      amount: o.amount,
    })),
  };
}

@Component({
  selector: 'app-payments-page',
  standalone: true,
  imports: [DecimalPipe, RouterLink, PageLoader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
@if (loading()) { <app-page-loader /> } @else {
<div class="pay">

  <!-- Sadece bayiler içindir -->
  @if (!isDealer()) {
    <div class="pay__guard">
      <i class="pi pi-info-circle"></i>
      <div>
        <h2>Bu sayfa bayiler içindir</h2>
        <p>
          Bireysel hesaplarda ödeme sipariş anında alınır; aylık borç biriktirilmez.
          Siparişlerinizi <a routerLink="/dashboard/orders">Siparişlerim</a> sayfasından görebilirsiniz.
        </p>
      </div>
    </div>
  } @else {

  <!-- HEADER -->
  <div class="pay__header">
    <div>
      <h1 class="pay__title">Ödeme Borçlarım</h1>
      <p class="pay__sub">Bayi hesabınızın aylık ekstresi — her ayın 1'inde ödenir</p>
    </div>
  </div>

  <!-- ÖZET KARTLARI -->
  <div class="pay__cards">
    <div class="sum-card sum-card--accent">
      <span class="sum-card__lbl">Bu Ay Birikiyor</span>
      <span class="sum-card__val">₺{{ accruingTotal() | number }}</span>
      <span class="sum-card__meta"><i class="pi pi-calendar-clock"></i> Son ödeme: {{ accruingDue() }}</span>
    </div>
    <div class="sum-card sum-card--warn">
      <span class="sum-card__lbl">Vadesi Gelen</span>
      <span class="sum-card__val">₺{{ dueTotal() | number }}</span>
      <span class="sum-card__meta"><i class="pi pi-exclamation-circle"></i> {{ dueCount() }} ekstre bekliyor</span>
    </div>
    <div class="sum-card">
      <span class="sum-card__lbl">Toplam Açık Bakiye</span>
      <span class="sum-card__val">₺{{ outstandingTotal() | number }}</span>
      <span class="sum-card__meta"><i class="pi pi-wallet"></i> Birikiyor + vadesi gelen</span>
    </div>
    <div class="sum-card sum-card--paid">
      <span class="sum-card__lbl">Toplam Ödenen</span>
      <span class="sum-card__val">₺{{ paidTotal() | number }}</span>
      <span class="sum-card__meta"><i class="pi pi-check-circle"></i> {{ paidCount() }} ekstre ödendi</span>
    </div>
  </div>

  <!-- EKSTRELER -->
  <div class="pay__statements">
    @for (st of statements(); track st.id) {
      <div class="stmt stmt--{{ st.status }}">

        <button class="stmt__head" type="button" (click)="toggle(st.id)">
          <div class="stmt__head-left">
            <i class="pi" [class.pi-chevron-down]="isOpen(st.id)" [class.pi-chevron-right]="!isOpen(st.id)"></i>
            <div>
              <p class="stmt__period">{{ st.period }} <span class="stmt__id">{{ st.id }}</span></p>
              <p class="stmt__due">
                <i class="pi pi-calendar"></i>
                @if (st.status === 'paid') { Ödendi · {{ st.paidAt }} }
                @else { Son ödeme: {{ st.dueDate }} }
              </p>
            </div>
          </div>
          <div class="stmt__head-right">
            <span class="stmt__count">{{ st.orders.length }} sipariş</span>
            <span class="stmt__amount">₺{{ totalOf(st) | number }}</span>
            <span class="st-chip st-chip--{{ st.status }}"><span class="st-dot"></span>{{ statusLabel(st.status) }}</span>
          </div>
        </button>

        @if (isOpen(st.id)) {
          <div class="stmt__body">
            <table class="stmt__table">
              <thead><tr><th>Sipariş</th><th>Araç</th><th>Servis</th><th>Tarih</th><th class="ta-r">Tutar</th></tr></thead>
              <tbody>
                @for (o of st.orders; track o.id) {
                  <tr>
                    <td class="mono">{{ o.id }}</td>
                    <td>{{ o.vehicle }}</td>
                    <td class="muted">{{ o.service }}</td>
                    <td class="muted">{{ o.date }}</td>
                    <td class="ta-r price">₺{{ o.amount | number }}</td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr><td colspan="4" class="ta-r foot-lbl">Dönem Toplamı</td><td class="ta-r foot-val">₺{{ totalOf(st) | number }}</td></tr>
              </tfoot>
            </table>

            @if (st.status === 'due' || st.status === 'overdue') {
              <div class="stmt__actions">
                <p class="stmt__pay-note">
                  <i class="pi pi-info-circle"></i>
                  Bu ekstrenin son ödeme tarihi {{ st.dueDate }}. Ödemeyi tamamlayarak hesabınızı güncel tutun.
                </p>
                <button class="pay-btn" type="button" (click)="payStatement(st.id)">
                  <i class="pi pi-credit-card"></i> ₺{{ totalOf(st) | number }} Öde
                </button>
              </div>
            } @else if (st.status === 'accruing') {
              <p class="stmt__accruing-note">
                <i class="pi pi-clock"></i>
                Bu dönem hâlâ açık. Ay sonunda kapanacak ve {{ st.dueDate }} tarihinde ödenecek.
              </p>
            }
          </div>
        }
      </div>
    }
  </div>

  @if (paidMsg()) {
    <div class="pay__toast"><i class="pi pi-check-circle"></i> {{ paidMsg() }}</div>
  }

  }
</div>
}
  `,
  styles: [`
    .pay { display: flex; flex-direction: column; gap: 1.5rem; }

    /* Guard (non-dealer) */
    .pay__guard {
      display: flex; align-items: flex-start; gap: 1rem; max-width: 560px;
      background: #1a1d27; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.75rem;
      i { font-size: 1.5rem; color: #60a5fa; flex-shrink: 0; }
      h2 { font-size: 1.05rem; color: #fff; margin: 0 0 0.4rem; }
      p { font-size: 0.85rem; color: rgba(255,255,255,0.55); margin: 0; line-height: 1.6; }
      a { color: #e63946; text-decoration: none; &:hover { text-decoration: underline; } }
    }

    .pay__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .pay__sub   { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }

    /* Summary cards */
    .pay__cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; @media(max-width:1024px){ grid-template-columns: repeat(2, 1fr); } @media(max-width:560px){ grid-template-columns: 1fr; } }
    .sum-card {
      background: #1a1d27; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.3rem 1.4rem;
      display: flex; flex-direction: column; gap: 0.4rem;
      &__lbl { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(255,255,255,0.4); }
      &__val { font-size: 1.7rem; font-weight: 800; color: #fff; }
      &__meta { display: flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; color: rgba(255,255,255,0.4); i { font-size: 0.75rem; } }
      &--accent { border-color: rgba(96,165,250,0.3); .sum-card__val { color: #60a5fa; } }
      &--warn   { border-color: rgba(251,191,36,0.3); .sum-card__val { color: #fbbf24; } }
      &--paid   { border-color: rgba(74,222,128,0.3); .sum-card__val { color: #4ade80; } }
    }

    /* Statements */
    .pay__statements { display: flex; flex-direction: column; gap: 0.85rem; }
    .stmt { background: #1a1d27; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden; transition: border-color 200ms;
      &--due     { border-color: rgba(251,191,36,0.25); }
      &--overdue { border-color: rgba(248,113,113,0.3); }
    }
    .stmt__head {
      width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      padding: 1.1rem 1.4rem; background: transparent; border: none; cursor: pointer; text-align: left;
      transition: background 160ms; &:hover { background: rgba(255,255,255,0.02); }
    }
    .stmt__head-left { display: flex; align-items: center; gap: 0.85rem; min-width: 0;
      > i { color: rgba(255,255,255,0.35); font-size: 0.8rem; flex-shrink: 0; }
    }
    .stmt__period { font-size: 0.95rem; font-weight: 700; color: #fff; margin: 0 0 3px; }
    .stmt__id { font-size: 0.68rem; font-weight: 500; color: rgba(255,255,255,0.3); font-family: monospace; margin-left: 0.4rem; }
    .stmt__due { display: flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; color: rgba(255,255,255,0.4); margin: 0; i { font-size: 0.7rem; } }
    .stmt__head-right { display: flex; align-items: center; gap: 1rem; flex-shrink: 0; }
    .stmt__count  { font-size: 0.72rem; color: rgba(255,255,255,0.35); white-space: nowrap; @media(max-width:640px){ display: none; } }
    .stmt__amount { font-size: 1.05rem; font-weight: 800; color: #fff; white-space: nowrap; }

    .st-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 0.68rem; font-weight: 600; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
    .st-dot  { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .st-chip--accruing { background: rgba(96,165,250,0.12); color: #60a5fa; }
    .st-chip--due      { background: rgba(251,191,36,0.12); color: #fbbf24; }
    .st-chip--paid     { background: rgba(74,222,128,0.12); color: #4ade80; }
    .st-chip--overdue  { background: rgba(248,113,113,0.12); color: #f87171; }

    .stmt__body { padding: 0 1.4rem 1.4rem; border-top: 1px solid rgba(255,255,255,0.05); }
    .stmt__table { width: 100%; border-collapse: collapse; margin-top: 0.5rem;
      th { padding: 0.7rem 0.6rem; font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.35); text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); }
      td { padding: 0.7rem 0.6rem; font-size: 0.8rem; color: rgba(255,255,255,0.75); border-bottom: 1px solid rgba(255,255,255,0.04); }
    }
    .ta-r { text-align: right !important; }
    .mono { font-family: monospace; color: rgba(255,255,255,0.6) !important; }
    .muted { color: rgba(255,255,255,0.45) !important; }
    .price { font-weight: 700; color: #fff !important; }
    .foot-lbl { font-size: 0.75rem; color: rgba(255,255,255,0.4) !important; font-weight: 600; padding-top: 0.85rem !important; }
    .foot-val { font-size: 0.95rem; font-weight: 800; color: #fff !important; padding-top: 0.85rem !important; }

    .stmt__actions { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-top: 1rem; }
    .stmt__pay-note { display: flex; align-items: center; gap: 0.5rem; font-size: 0.74rem; color: rgba(255,255,255,0.45); margin: 0; flex: 1; min-width: 220px; i { color: #fbbf24; } }
    .stmt__accruing-note { display: flex; align-items: center; gap: 0.5rem; font-size: 0.74rem; color: rgba(255,255,255,0.4); margin: 1rem 0 0; i { color: #60a5fa; } }
    .pay-btn {
      display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.7rem 1.4rem; border-radius: 11px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #e63946, #c1121f); color: #fff; font-size: 0.85rem; font-weight: 700; white-space: nowrap;
      transition: all 180ms; &:hover { opacity: 0.9; transform: translateY(-1px); }
    }

    .pay__toast {
      position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 200;
      display: flex; align-items: center; gap: 0.5rem; padding: 0.85rem 1.25rem; border-radius: 12px;
      background: rgba(74,222,128,0.12); border: 1px solid rgba(74,222,128,0.3); color: #4ade80; font-size: 0.85rem; font-weight: 600;
      i { font-size: 1rem; }
    }
  `],
})
export class PaymentsPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly paymentsApi = inject(PaymentsService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly isDealer = this.auth.isDealer;

  protected readonly statements = signal<MonthlyStatement[]>([]);
  protected readonly openIds = signal<Set<string>>(new Set());
  protected readonly paidMsg = signal('');
  protected readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    if (!this.isDealer()) { this.loading.set(false); return; }
    try {
      const data = await this.paymentsApi.listStatements();
      this.statements.set(data.map(mapStatement));
      // En güncel açık ekstreleri varsayılan aç
      this.openIds.set(new Set(data.filter(s => s.status !== 'paid').map(s => s.statementNo)));
    } catch {
      /* sessiz */
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  protected readonly accruingDue = computed(
    () => this.statements().find(s => s.status === 'accruing')?.dueDate ?? '—',
  );
  protected readonly accruingTotal = computed(() =>
    this.sumByStatus('accruing'),
  );
  protected readonly dueTotal = computed(() =>
    this.sumByStatus('due') + this.sumByStatus('overdue'),
  );
  protected readonly dueCount = computed(() =>
    this.statements().filter(s => s.status === 'due' || s.status === 'overdue').length,
  );
  protected readonly outstandingTotal = computed(() =>
    this.accruingTotal() + this.dueTotal(),
  );
  protected readonly paidTotal = computed(() => this.sumByStatus('paid'));
  protected readonly paidCount = computed(() =>
    this.statements().filter(s => s.status === 'paid').length,
  );

  private sumByStatus(status: DebtStatus): number {
    return this.statements()
      .filter(s => s.status === status)
      .reduce((sum, s) => sum + this.totalOf(s), 0);
  }

  totalOf(st: MonthlyStatement): number {
    return st.orders.reduce((sum, o) => sum + o.amount, 0);
  }
  statusLabel(s: DebtStatus): string { return STATUS_META[s].label; }

  isOpen(id: string): boolean { return this.openIds().has(id); }
  toggle(id: string): void {
    const s = new Set(this.openIds());
    if (s.has(id)) { s.delete(id); } else { s.add(id); }
    this.openIds.set(s);
  }

  payStatement(id: string): void {
    const st = this.statements().find(s => s.id === id);
    if (st) {
      this.paidMsg.set(`${st.period} ekstresi için ödeme talebi alındı.`);
    }
  }
}
