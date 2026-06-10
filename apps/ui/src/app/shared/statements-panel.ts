import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PaymentsService, Statement } from '../core/payments/payments.service';
import { stageLabel, formatTrDate, paymentStatusLabel } from '../core/orders/order-format';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { I18nService } from '../core/i18n/i18n.service';

type DebtStatus = 'accruing' | 'due' | 'paid' | 'overdue';
type OrderPayStatus = 'unpaid' | 'paid' | 'refunded' | 'voided';

interface DebtOrder {
  id: string; date: string; vehicle: string; service: string; amount: number;
  cancelled: boolean;
  orderStatus: string;       // completed / pending / cancelled
  paymentStatus: OrderPayStatus;
}
interface MonthlyStatement {
  id: string;        // statementNo (aç/kapa takibi)
  dbId: string;      // gerçek UUID (ödeme API'si)
  periodYear: number; periodMonth: number; dueDate: string; status: DebtStatus;
  orders: DebtOrder[]; paidAt?: string;
}

const STATUS_KEY: Record<DebtStatus, string> = {
  accruing: 'pay.st.accruing',
  due:      'pay.st.due',
  paid:     'pay.st.paid',
  overdue:  'pay.st.overdue',
};

function mapStatement(s: Statement): MonthlyStatement {
  return {
    id: s.statementNo,
    dbId: s.id,
    periodYear: s.periodYear,
    periodMonth: s.periodMonth,
    dueDate: formatTrDate(s.dueDate),
    status: s.status,
    paidAt: s.paidAt ? formatTrDate(s.paidAt) : undefined,
    orders: s.orders.map(o => ({
      id: o.orderNo,
      date: formatTrDate(o.createdAt),
      vehicle: [o.make, o.model].filter(Boolean).join(' '),
      service: stageLabel(o.stage),
      amount: o.amount,
      cancelled: o.status === 'cancelled',
      orderStatus: o.status,
      // İptal: ekstre ödendiyse gerçek iade, değilse hiç tahsil edilmedi (sadece düşüldü).
      // İptal değil: ekstre ödendiyse ödendi, değilse ödeme bekliyor.
      paymentStatus: o.status === 'cancelled'
        ? (s.status === 'paid' ? 'refunded' : 'voided')
        : (s.status === 'paid' ? 'paid' : 'unpaid'),
    })),
  };
}

/**
 * Bayi aylık ekstre paneli — özet kartları + açılır ekstre listesi.
 * Hem Ödeme Borçlarım (bayi) hem Admin > Kullanıcı detayında kullanılır.
 */
@Component({
  selector: 'app-statements-panel',
  standalone: true,
  imports: [DecimalPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ÖZET KARTLARI -->
    <div class="pay__cards pay__cards--3">
      <div class="sum-card sum-card--accent">
        <span class="sum-card__lbl">{{ 'pay.card.accruing' | t }}</span>
        <span class="sum-card__val">₺{{ accruingTotal() | number }}</span>
        <span class="sum-card__meta"><i class="pi pi-calendar-clock"></i> {{ 'pay.lastPayment' | t:{ date: accruingDue() } }}</span>
      </div>
      <div class="sum-card sum-card--warn">
        <span class="sum-card__lbl">{{ 'pay.card.due' | t }}</span>
        <span class="sum-card__val">₺{{ dueTotal() | number }}</span>
        <span class="sum-card__meta"><i class="pi pi-exclamation-circle"></i> {{ 'pay.dueWaiting' | t:{ n: dueCount() } }}</span>
      </div>
      <div class="sum-card sum-card--paid">
        <span class="sum-card__lbl">{{ 'pay.card.totalPaid' | t }}</span>
        <span class="sum-card__val">₺{{ paidTotal() | number }}</span>
        <span class="sum-card__meta"><i class="pi pi-check-circle"></i> {{ 'pay.paidCount' | t:{ n: paidCount() } }}</span>
      </div>
    </div>

    <!-- EKSTRELER -->
    @if (rows().length === 0) {
      <div class="pay__empty"><i class="pi pi-wallet"></i><p>{{ 'pay.noStatements' | t }}</p></div>
    }
    <div class="pay__statements">
      @for (st of rows(); track st.id) {
        <div class="stmt stmt--{{ st.status }}">
          <button class="stmt__head" type="button" (click)="toggle(st.id)">
            <div class="stmt__head-left">
              <i class="pi" [class.pi-chevron-down]="isOpen(st.id)" [class.pi-chevron-right]="!isOpen(st.id)"></i>
              <div>
                <p class="stmt__period">{{ periodLabel(st) }} <span class="stmt__id">{{ st.id }}</span></p>
                <p class="stmt__due">
                  <i class="pi pi-calendar"></i>
                  @if (st.status === 'paid') { {{ 'pay.paidOn' | t:{ date: st.paidAt || '' } }} }
                  @else { {{ 'pay.lastPayment' | t:{ date: st.dueDate } }} }
                </p>
              </div>
            </div>
            <div class="stmt__head-right">
              <span class="stmt__count">{{ 'pay.orderCount' | t:{ n: st.orders.length } }}</span>
              <span class="stmt__amount">₺{{ totalOf(st) | number }}</span>
              <span class="st-chip st-chip--{{ st.status }}"><span class="st-dot"></span>{{ statusLabel(st.status) }}</span>
            </div>
          </button>

          @if (isOpen(st.id)) {
            <div class="stmt__body">
              <table class="stmt__table">
                <thead><tr><th>{{ 'pay.th.order' | t }}</th><th>{{ 'common.vehicle' | t }}</th><th>{{ 'pay.th.service' | t }}</th><th>{{ 'pay.th.date' | t }}</th><th>{{ 'pay.th.orderStatus' | t }}</th><th>{{ 'pay.th.payStatus' | t }}</th><th class="ta-r">{{ 'pay.th.amount' | t }}</th></tr></thead>
                <tbody>
                  @for (o of st.orders; track o.id) {
                    <tr [class.stmt__row--cancelled]="o.cancelled">
                      <td class="mono">{{ o.id }}</td>
                      <td>{{ o.vehicle }}</td>
                      <td class="muted">{{ o.service }}</td>
                      <td class="muted">{{ o.date }}</td>
                      <td><span class="st-chip st-chip--ord-{{ o.orderStatus }}"><span class="st-dot"></span>{{ orderStatusLabel(o.orderStatus) }}</span></td>
                      <td><span class="st-chip st-chip--pay-{{ o.paymentStatus }}"><span class="st-dot"></span>{{ payStatusLabel(o.paymentStatus) }}</span></td>
                      <td class="ta-r price" [class.stmt__amount--struck]="o.cancelled">₺{{ o.amount | number }}</td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr><td colspan="6" class="ta-r foot-lbl">{{ 'pay.periodTotal' | t }}</td><td class="ta-r foot-val">₺{{ totalOf(st) | number }}</td></tr>
                </tfoot>
              </table>

              @if (st.status === 'due' || st.status === 'overdue') {
                <div class="stmt__actions">
                  <p class="stmt__pay-note">
                    <i class="pi pi-info-circle"></i>
                    {{ 'pay.dueNote' | t:{ date: st.dueDate } }}
                  </p>
                  @if (!readonly) {
                    <button class="pay-btn" type="button" [disabled]="paying() === st.dbId" (click)="payStatement(st.dbId)">
                      <i class="pi" [class.pi-credit-card]="paying() !== st.dbId" [class.pi-spin]="paying() === st.dbId" [class.pi-spinner]="paying() === st.dbId"></i>
                      {{ paying() === st.dbId ? ('tl.sending' | t) : ('pay.pay' | t) }} ₺{{ totalOf(st) | number }}
                    </button>
                  }
                </div>
              } @else if (st.status === 'accruing') {
                <p class="stmt__accruing-note">
                  <i class="pi pi-clock"></i>
                  {{ 'pay.accruingNote' | t:{ date: st.dueDate } }}
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
  `,
  styles: [`
    :host { display: flex; flex-direction: column; gap: 1.5rem; }
    .pay__cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; @media(max-width:1024px){ grid-template-columns: repeat(2, 1fr); } @media(max-width:560px){ grid-template-columns: 1fr; } }
    .pay__cards--3 { grid-template-columns: repeat(3, 1fr); @media(max-width:900px){ grid-template-columns: 1fr; } }
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
    .pay__empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2.5rem; color: rgba(255,255,255,0.3); i { font-size: 1.6rem; } p { margin: 0; font-size: 0.85rem; } }
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
    .st-chip--ord-completed  { background: rgba(74,222,128,0.12); color: #4ade80; }
    .st-chip--ord-pending    { background: rgba(96,165,250,0.12); color: #60a5fa; }
    .st-chip--ord-processing { background: rgba(96,165,250,0.12); color: #60a5fa; }
    .st-chip--ord-cancelled  { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4); }
    .st-chip--pay-unpaid   { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .st-chip--pay-paid     { background: rgba(74,222,128,0.12); color: #4ade80; }
    .st-chip--pay-refunded { background: rgba(168,85,247,0.14); color: #a855f7; }
    .st-chip--pay-voided   { background: rgba(148,163,184,0.12); color: #94a3b8; }
    .stmt__body { padding: 0 1.4rem 1.4rem; border-top: 1px solid rgba(255,255,255,0.05); }
    .stmt__table { width: 100%; border-collapse: collapse; margin-top: 0.5rem;
      th { padding: 0.7rem 0.6rem; font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.35); text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); }
      td { padding: 0.7rem 0.6rem; font-size: 0.8rem; color: rgba(255,255,255,0.75); border-bottom: 1px solid rgba(255,255,255,0.04); }
    }
    .ta-r { text-align: right !important; }
    .mono { font-family: monospace; color: rgba(255,255,255,0.6) !important; }
    .muted { color: rgba(255,255,255,0.45) !important; }
    .price { font-weight: 700; color: #fff !important; }
    .stmt__row--cancelled .mono, .stmt__row--cancelled .muted,
    .stmt__row--cancelled td:nth-child(2) { opacity: 0.45; }
    .stmt__amount--struck { text-decoration: line-through; opacity: 0.55; }
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
export class StatementsPanel {
  private readonly i18n = inject(I18nService);
  private readonly paymentsApi = inject(PaymentsService);

  /** Admin görünümünde "Öde" butonu gizlenir. */
  @Input() readonly = false;

  /** Ödeme başarılı olunca ebeveyn listeyi tazelesin. */
  @Output() paid = new EventEmitter<string>();

  /** Ödeme yapılan ekstrenin id'si (buton spinner'ı için). */
  protected readonly paying = signal<string | null>(null);

  @Input() set statements(v: Statement[]) {
    this._rows.set((v ?? []).map(mapStatement));
    this._open.set(new Set((v ?? []).filter(s => s.status !== 'paid').map(s => s.statementNo)));
  }

  private readonly _rows = signal<MonthlyStatement[]>([]);
  private readonly _open = signal<Set<string>>(new Set());
  protected readonly paidMsg = signal('');

  protected readonly rows = this._rows.asReadonly();

  protected readonly accruingDue = computed(
    () => this._rows().find(s => s.status === 'accruing')?.dueDate ?? '—',
  );
  protected readonly accruingTotal = computed(() => this.sumByStatus('accruing'));
  protected readonly dueTotal = computed(() => this.sumByStatus('due') + this.sumByStatus('overdue'));
  protected readonly dueCount = computed(() =>
    this._rows().filter(s => s.status === 'due' || s.status === 'overdue').length,
  );
  protected readonly outstandingTotal = computed(() => this.accruingTotal() + this.dueTotal());
  protected readonly paidTotal = computed(() => this.sumByStatus('paid'));
  protected readonly paidCount = computed(() => this._rows().filter(s => s.status === 'paid').length);

  private sumByStatus(status: DebtStatus): number {
    return this._rows().filter(s => s.status === status).reduce((sum, s) => sum + this.totalOf(s), 0);
  }

  totalOf(st: MonthlyStatement): number {
    // İptal edilen siparişler bakiyeye dahil edilmez (iade edilir).
    return st.orders.reduce((sum, o) => sum + (o.cancelled ? 0 : o.amount), 0);
  }
  /** "Haziran 2026" / "June 2026" — aktif dile göre. */
  periodLabel(st: MonthlyStatement): string {
    return `${this.i18n.t(`monL.${st.periodMonth - 1}`)} ${st.periodYear}`;
  }
  statusLabel(s: DebtStatus): string { return this.i18n.t(STATUS_KEY[s]); }
  orderStatusLabel(s: string): string {
    const key: Record<string, string> = {
      completed: 'status.completed', pending: 'status.pending',
      processing: 'status.processing', cancelled: 'status.cancelled',
    };
    return key[s] ? this.i18n.t(key[s]) : s;
  }
  payStatusLabel(s: string): string { return paymentStatusLabel(s); }
  isOpen(id: string): boolean { return this._open().has(id); }
  toggle(id: string): void {
    const s = new Set(this._open());
    if (s.has(id)) { s.delete(id); } else { s.add(id); }
    this._open.set(s);
  }
  async payStatement(id: string): Promise<void> {
    if (this.paying()) { return; }
    const st = this._rows().find(s => s.dbId === id);
    this.paying.set(id);
    try {
      await this.paymentsApi.payStatement(id);
      if (st) { this.paidMsg.set(this.i18n.t('pay.toast', { period: this.periodLabel(st) })); }
      this.paid.emit(id); // ebeveyn listeyi tazeler
    } catch {
      this.paidMsg.set(this.i18n.t('pr.saveFailed'));
    } finally {
      this.paying.set(null);
    }
  }
}
