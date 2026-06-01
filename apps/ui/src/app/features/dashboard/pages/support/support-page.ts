import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { PageLoader } from '../../../../shared/page-loader';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketsService, Ticket as ApiTicket } from '../../../../core/tickets/tickets.service';
import { OrdersService } from '../../../../core/orders/orders.service';
import { stageLabel } from '../../../../core/orders/order-format';

/* ─── Types ──────────────────────────────────────────────── */
type TicketStatus = 'open' | 'pending' | 'resolved';

interface TicketMessage {
  id: string;
  text: string;
  sender: 'user' | 'support';
  createdAt: string;
}

interface Ticket {
  id: string;
  ticketNo: string;
  orderLabel: string | null;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  messages: TicketMessage[];
}

interface OrderOption {
  id: string;
  label: string;
}

/** API Ticket → ekran modeli. */
function mapTicket(t: ApiTicket): Ticket {
  return {
    id: t.id,
    ticketNo: t.ticketNo,
    orderLabel: t.orderLabel ? `${t.orderNo} · ${t.orderLabel}` : null,
    subject: t.subject,
    status: t.status,
    createdAt: t.createdAt,
    messages: t.messages.map((m, i) => ({
      id: `m${i}`,
      text: m.body,
      sender: m.sender,
      createdAt: m.createdAt,
    })),
  };
}

/* ─── Component ──────────────────────────────────────────── */
@Component({
  selector: 'app-support-page',
  standalone: true,
  imports: [DatePipe, FormsModule, PageLoader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
@if (loading()) { <app-page-loader /> } @else {
<div class="sp">

  <!-- PAGE HEADER -->
  <div class="sp__header">
    <div>
      <h1 class="sp__title">Destek</h1>
      <p class="sp__sub">Siparişleriniz üzerinden ticket oluşturun, destek ekibimizle iletişime geçin</p>
    </div>
    <button class="sp-new-btn" type="button" (click)="openNewTicket()">
      <i class="pi pi-plus"></i> Yeni Ticket
    </button>
  </div>

  <!-- MAIN LAYOUT -->
  <div class="sp__layout">

    <!-- ── LEFT: Ticket List ── -->
    <div class="sp__list">
      @if (tickets().length === 0) {
        <div class="sp__empty">
          <i class="pi pi-inbox"></i>
          <p>Henüz ticket oluşturmadınız</p>
        </div>
      }
      @for (t of tickets(); track t.id) {
        <button
          type="button"
          class="tkt-row"
          [class.tkt-row--active]="activeTicketId() === t.id"
          (click)="activeTicketId.set(t.id)"
        >
          <div class="tkt-row__top">
            <span class="tkt-status tkt-status--{{ t.status }}">
              {{ statusLabel(t.status) }}
            </span>
            <span class="tkt-row__date">{{ t.createdAt | date:'d MMM' }}</span>
          </div>
          <p class="tkt-row__subject">{{ t.subject }}</p>
          <p class="tkt-row__order"><i class="pi" [class.pi-box]="t.orderLabel" [class.pi-comment]="!t.orderLabel"></i> {{ t.orderLabel || 'Özel Talep' }}</p>
          <p class="tkt-row__preview">{{ t.messages[t.messages.length - 1].text }}</p>
        </button>
      }
    </div>

    <!-- ── RIGHT: Conversation ── -->
    <div class="sp__convo">
      @if (!activeTicket()) {
        <div class="sp__convo-empty">
          <i class="pi pi-comments"></i>
          <p>Bir ticket seçin veya yeni oluşturun</p>
        </div>
      } @else {
        <!-- Convo Header -->
        <div class="convo__head">
          <div class="convo__head-left">
            <span class="tkt-status tkt-status--{{ activeTicket()!.status }}">
              {{ statusLabel(activeTicket()!.status) }}
            </span>
            <div>
              <h2 class="convo__subject">{{ activeTicket()!.subject }}</h2>
              <p class="convo__order">
                <i class="pi" [class.pi-box]="activeTicket()!.orderLabel" [class.pi-comment]="!activeTicket()!.orderLabel"></i>
                {{ activeTicket()!.orderLabel || 'Özel Talep' }}
                <span class="convo__no">{{ activeTicket()!.ticketNo }}</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Messages -->
        <div class="convo__messages">
          @for (msg of activeTicket()!.messages; track msg.id) {
            <div class="msg" [class.msg--user]="msg.sender === 'user'" [class.msg--support]="msg.sender === 'support'">
              <div class="msg__avatar">
                @if (msg.sender === 'support') {
                  <span class="msg__avatar-icon msg__avatar-icon--support"><i class="pi pi-headphones"></i></span>
                } @else {
                  <span class="msg__avatar-icon msg__avatar-icon--user">AY</span>
                }
              </div>
              <div class="msg__body">
                <div class="msg__meta">
                  <span class="msg__sender">{{ msg.sender === 'user' ? 'Siz' : 'Destek Ekibi' }}</span>
                  <span class="msg__time">{{ msg.createdAt | date:'d MMM, HH:mm' }}</span>
                </div>
                <div class="msg__bubble">{{ msg.text }}</div>
              </div>
            </div>
          }
        </div>

        <!-- Reply Box -->
        @if (activeTicket()!.status !== 'resolved') {
          <div class="convo__reply">
            <textarea
              class="convo__reply-input"
              rows="3"
              placeholder="Mesajınızı yazın…"
              [(ngModel)]="replyText"
            ></textarea>
            <button
              class="sp-send-btn"
              type="button"
              [disabled]="!replyText.trim() || busy()"
              (click)="sendReply()"
            >
              <i class="pi" [class.pi-send]="!busy()" [class.pi-spin]="busy()" [class.pi-spinner]="busy()"></i>
              {{ busy() ? 'Gönderiliyor…' : 'Gönder' }}
            </button>
          </div>
        } @else {
          <div class="convo__resolved-note">
            <i class="pi pi-check-circle"></i> Bu ticket çözüldü olarak kapatılmıştır.
          </div>
        }
      }
    </div>

  </div><!-- /sp__layout -->

</div><!-- /sp -->

<!-- ═══════════════════ NEW TICKET MODAL ═══════════════════ -->
@if (showNewTicket()) {
  <div class="ntm-backdrop" (click)="closeNewTicket()" aria-hidden="true"></div>
  <div class="ntm" role="dialog" aria-modal="true" aria-labelledby="ntm-title">

    <div class="ntm__head">
      <h3 id="ntm-title" class="ntm__title">Yeni Destek Talebi</h3>
      <button class="ntm__close" type="button" (click)="closeNewTicket()" aria-label="Kapat">
        <i class="pi pi-times"></i>
      </button>
    </div>

    <div class="ntm__body">
      <!-- Talep türü -->
      <div class="ntm__field">
        <span class="ntm__label">Talep Türü</span>
        <div class="ntm__toggle">
          <button type="button" class="ntm__toggle-btn"
            [class.ntm__toggle-btn--active]="newTicketType === 'order'"
            (click)="newTicketType = 'order'">
            <i class="pi pi-box"></i> Sipariş ile İlgili
          </button>
          <button type="button" class="ntm__toggle-btn"
            [class.ntm__toggle-btn--active]="newTicketType === 'custom'"
            (click)="newTicketType = 'custom'">
            <i class="pi pi-comment"></i> Özel Talep
          </button>
        </div>
      </div>

      @if (newTicketType === 'order') {
        <div class="ntm__field">
          <label class="ntm__label" for="ntm-order">Sipariş</label>
          @if (orders().length > 0) {
            <div class="sel-wrap">
              <select id="ntm-order" class="sel" [(ngModel)]="newOrderId">
                <option value="">— Sipariş seçin —</option>
                @for (o of orders(); track o.id) {
                  <option [value]="o.id">{{ o.label }}</option>
                }
              </select>
              <i class="pi pi-chevron-down sel-arrow"></i>
            </div>
          } @else {
            <p class="ntm__hint">Henüz siparişiniz yok. "Özel Talep" seçerek yazabilirsiniz.</p>
          }
        </div>
      }

      <div class="ntm__field">
        <label class="ntm__label" for="ntm-subject">Konu</label>
        <input id="ntm-subject" class="ntm__input" type="text" placeholder="Sorununuzu kısaca özetleyin…" [(ngModel)]="newSubject" />
      </div>

      <div class="ntm__field">
        <label class="ntm__label" for="ntm-message">Mesaj</label>
        <textarea id="ntm-message" class="ntm__textarea" rows="4" placeholder="Detaylı açıklama yazın…" [(ngModel)]="newMessage"></textarea>
      </div>
    </div>

    <div class="ntm__footer">
      <button class="ghost-btn" type="button" (click)="closeNewTicket()">İptal</button>
      <button
        class="sp-send-btn"
        type="button"
        [disabled]="!canSubmit() || busy()"
        (click)="submitNewTicket()"
      >
        <i class="pi" [class.pi-send]="!busy()" [class.pi-spin]="busy()" [class.pi-spinner]="busy()"></i>
        {{ busy() ? 'Gönderiliyor…' : 'Talep Oluştur' }}
      </button>
    </div>

  </div>
}
}
  `,
  styles: [`
    /* ── Shell ── */
    .sp { display: flex; flex-direction: column; gap: 1.5rem; }
    .sp__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .sp__sub { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
    .sp__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }

    /* ── New Ticket Button ── */
    .sp-new-btn {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.65rem 1.25rem; border-radius: 10px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #e63946, #c1121f);
      color: #fff; font-size: 0.875rem; font-weight: 600;
      transition: opacity 150ms;
      &:hover { opacity: 0.88; }
      i { font-size: 0.85rem; }
    }

    /* ── Layout ── */
    .sp__layout {
      display: grid; grid-template-columns: 340px 1fr; gap: 1.25rem; align-items: start;
      @media (max-width: 860px) { grid-template-columns: 1fr; }
    }

    /* ── Ticket List ── */
    .sp__list { display: flex; flex-direction: column; gap: 0.5rem; }
    .sp__empty {
      display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
      padding: 3rem 1rem; color: rgba(255,255,255,0.2);
      i { font-size: 2.5rem; }
      p { font-size: 0.875rem; margin: 0; }
    }

    .tkt-row {
      width: 100%; text-align: left; cursor: pointer; border: none;
      background: #1a1d27; border: 1px solid rgba(255,255,255,0.07);
      border-radius: 14px; padding: 1rem 1.1rem;
      display: flex; flex-direction: column; gap: 0.35rem;
      transition: border-color 180ms, background 180ms;
      &:hover { border-color: rgba(255,255,255,0.14); background: #1e2130; }
      &--active { border-color: rgba(230,57,70,0.45); background: rgba(230,57,70,0.04); }
      &__top { display: flex; align-items: center; justify-content: space-between; }
      &__date { font-size: 0.72rem; color: rgba(255,255,255,0.3); }
      &__subject { font-size: 0.875rem; font-weight: 600; color: #fff; margin: 0; }
      &__order { font-size: 0.72rem; color: rgba(255,255,255,0.35); margin: 0;
        display: flex; align-items: center; gap: 0.3rem;
        i { font-size: 0.7rem; }
      }
      &__preview {
        font-size: 0.75rem; color: rgba(255,255,255,0.3); margin: 0;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
    }

    /* ── Status Badge ── */
    .tkt-status {
      display: inline-flex; align-items: center; padding: 0.2rem 0.6rem;
      border-radius: 6px; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      &--open    { background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.25); }
      &--pending { background: rgba(96,165,250,0.12); color: #60a5fa; border: 1px solid rgba(96,165,250,0.25); }
      &--resolved{ background: rgba(74,222,128,0.12); color: #4ade80; border: 1px solid rgba(74,222,128,0.25); }
    }

    /* ── Conversation ── */
    .sp__convo {
      background: #1a1d27; border: 1px solid rgba(255,255,255,0.07);
      border-radius: 20px; overflow: hidden;
      display: flex; flex-direction: column; min-height: 520px;
    }
    .sp__convo-empty {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem;
      color: rgba(255,255,255,0.2);
      i { font-size: 3rem; }
      p { font-size: 0.875rem; margin: 0; }
    }

    .convo__head {
      display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;
      padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.07);
      &-left { display: flex; align-items: flex-start; gap: 0.75rem; }
    }
    .convo__subject { font-size: 1rem; font-weight: 700; color: #fff; margin: 0 0 3px; }
    .convo__order { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin: 0; display: flex; align-items: center; gap: 0.3rem; }
    .convo__head-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }

    /* ── Messages ── */
    .convo__messages {
      flex: 1; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem;
      overflow-y: auto; max-height: 480px;
    }
    .msg {
      display: flex; gap: 0.75rem;
      &--user { flex-direction: row-reverse; }
      &__avatar { flex-shrink: 0; }
      &__avatar-icon {
        width: 36px; height: 36px; border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.75rem; font-weight: 700;
        &--support { background: rgba(230,57,70,0.15); color: #e63946; }
        &--user    { background: rgba(96,165,250,0.15); color: #60a5fa; }
      }
      &__body { display: flex; flex-direction: column; gap: 0.3rem; max-width: 70%; }
      &__meta { display: flex; align-items: center; gap: 0.5rem; }
      &__sender { font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.5); }
      &__time   { font-size: 0.68rem; color: rgba(255,255,255,0.25); }
      &__bubble {
        padding: 0.75rem 1rem; border-radius: 12px;
        font-size: 0.85rem; line-height: 1.55; color: rgba(255,255,255,0.85);
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.07);
        white-space: pre-wrap; word-break: break-word;
      }
      &--user &__meta { flex-direction: row-reverse; }
      &--user &__bubble { background: rgba(230,57,70,0.1); border-color: rgba(230,57,70,0.2); }
    }

    /* ── Reply ── */
    .convo__reply {
      padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.07);
      display: flex; gap: 0.75rem; align-items: flex-end;
    }
    .convo__reply-input {
      flex: 1; background: #0d0f14; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px; padding: 0.75rem 1rem; color: rgba(255,255,255,0.85);
      font-size: 0.875rem; resize: none; font-family: inherit;
      &:focus { outline: none; border-color: rgba(230,57,70,0.4); }
      &::placeholder { color: rgba(255,255,255,0.2); }
    }
    .convo__resolved-note {
      padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.07);
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.8rem; color: #4ade80;
      i { font-size: 0.9rem; }
    }

    /* ── Send Button ── */
    .sp-send-btn {
      display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;
      padding: 0.65rem 1.25rem; border-radius: 10px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #e63946, #c1121f);
      color: #fff; font-size: 0.875rem; font-weight: 600;
      transition: opacity 150ms;
      &:hover:not(:disabled) { opacity: 0.88; }
      &:disabled { opacity: 0.35; cursor: not-allowed; }
    }

    /* ── Ghost button (reuse dashboard pattern) ── */
    .ghost-btn {
      display: flex; align-items: center; gap: 0.4rem;
      padding: 0.5rem 0.9rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12);
      background: transparent; color: rgba(255,255,255,0.6); font-size: 0.78rem; cursor: pointer;
      transition: all 150ms;
      &:hover { border-color: rgba(255,255,255,0.25); color: #fff; }
    }

    /* ── Sel (reuse dashboard select pattern) ── */
    .sel-wrap { position: relative; }
    .sel {
      width: 100%; padding: 0.7rem 2.5rem 0.7rem 1rem;
      background: #0d0f14; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; color: rgba(255,255,255,0.85);
      font-size: 0.875rem; appearance: none; cursor: pointer;
      option { background: #1a1d27; }
      &:focus { outline: none; border-color: rgba(230,57,70,0.5); }
    }
    .sel-arrow {
      position: absolute; right: 0.9rem; top: 50%; transform: translateY(-50%);
      font-size: 0.7rem; color: rgba(255,255,255,0.3); pointer-events: none;
    }

    /* ── New Ticket Modal ── */
    .ntm-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.65);
      backdrop-filter: blur(4px); z-index: 200;
    }
    .ntm {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      z-index: 201; width: 520px; max-width: calc(100vw - 2rem);
      background: #1a1d27; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px; overflow: hidden;
      animation: ntmIn 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes ntmIn {
      from { opacity: 0; transform: translate(-50%, -46%); }
      to   { opacity: 1; transform: translate(-50%, -50%); }
    }
    .ntm__head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .ntm__title { font-size: 1rem; font-weight: 700; color: #fff; margin: 0; }
    .ntm__close {
      width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer;
      background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5);
      display: flex; align-items: center; justify-content: center;
      transition: background 150ms;
      &:hover { background: rgba(255,255,255,0.1); color: #fff; }
    }
    .ntm__body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .ntm__field { display: flex; flex-direction: column; gap: 0.4rem; }
    .ntm__label { font-size: 0.7rem; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.07em; }
    .ntm__toggle { display: flex; gap: 0.5rem; }
    .ntm__toggle-btn {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
      padding: 0.65rem; border-radius: 10px; cursor: pointer; font-size: 0.82rem; font-weight: 600;
      background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6);
      transition: all 160ms;
      &--active { border-color: #e63946; background: rgba(230,57,70,0.1); color: #fff; }
    }
    .ntm__hint { font-size: 0.78rem; color: rgba(255,255,255,0.4); margin: 0; padding: 0.5rem 0; }
    .convo__no { font-family: 'Courier New', monospace; font-weight: 700; color: rgba(255,255,255,0.5); margin-left: 0.4rem; }
    .ntm__input {
      padding: 0.7rem 1rem; background: #0d0f14; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; color: rgba(255,255,255,0.85); font-size: 0.875rem;
      &:focus { outline: none; border-color: rgba(230,57,70,0.4); }
      &::placeholder { color: rgba(255,255,255,0.2); }
    }
    .ntm__textarea {
      padding: 0.75rem 1rem; background: #0d0f14; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; color: rgba(255,255,255,0.85); font-size: 0.875rem;
      resize: none; font-family: inherit;
      &:focus { outline: none; border-color: rgba(230,57,70,0.4); }
      &::placeholder { color: rgba(255,255,255,0.2); }
    }
    .ntm__footer {
      display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem;
      padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.07);
    }
  `],
})
export class SupportPage implements OnInit {
  private readonly ticketsApi = inject(TicketsService);
  private readonly ordersApi = inject(OrdersService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly orders = signal<OrderOption[]>([]);
  protected readonly tickets = signal<Ticket[]>([]);
  protected readonly activeTicketId = signal<string | null>(null);
  protected readonly showNewTicket = signal(false);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);

  protected readonly activeTicket = computed(() =>
    this.tickets().find(t => t.id === this.activeTicketId()) ?? null
  );

  protected replyText = '';
  /** 'order' = sipariş ile ilgili, 'custom' = özel talep */
  protected newTicketType: 'order' | 'custom' = 'order';
  protected newOrderId = '';
  protected newSubject = '';
  protected newMessage = '';

  async ngOnInit(): Promise<void> {
    try {
      const [tickets, orders] = await Promise.all([
        this.ticketsApi.listMyTickets(),
        this.ordersApi.listMyOrders(),
      ]);
      this.tickets.set(tickets.map(mapTicket));
      this.orders.set(orders.map(o => ({
        id: o.id,
        label: `${o.orderNo} · ${[o.make, o.model].filter(Boolean).join(' ')} · ${stageLabel(o.stage)}`,
      })));
    } catch {
      /* sessiz */
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  private async refresh(activeId?: string): Promise<void> {
    const tickets = await this.ticketsApi.listMyTickets();
    this.tickets.set(tickets.map(mapTicket));
    if (activeId) { this.activeTicketId.set(activeId); }
    this.cdr.markForCheck();
  }

  protected statusLabel(s: TicketStatus): string {
    return s === 'open' ? 'Açık' : s === 'pending' ? 'Beklemede' : 'Çözüldü';
  }

  protected async sendReply(): Promise<void> {
    const text = this.replyText.trim();
    const id = this.activeTicketId();
    if (!text || !id || this.busy()) { return; }
    this.busy.set(true);
    try {
      await this.ticketsApi.reply(id, text);
      this.replyText = '';
      await this.refresh(id);
    } catch { /* sessiz */ }
    finally { this.busy.set(false); this.cdr.markForCheck(); }
  }

  protected openNewTicket(): void {
    this.newTicketType = this.orders().length > 0 ? 'order' : 'custom';
    this.newOrderId = '';
    this.newSubject = '';
    this.newMessage = '';
    this.showNewTicket.set(true);
  }

  protected closeNewTicket(): void {
    this.showNewTicket.set(false);
  }

  protected canSubmit(): boolean {
    if (!this.newSubject.trim() || !this.newMessage.trim()) { return false; }
    if (this.newTicketType === 'order' && !this.newOrderId) { return false; }
    return true;
  }

  protected async submitNewTicket(): Promise<void> {
    if (!this.canSubmit() || this.busy()) { return; }
    this.busy.set(true);
    try {
      const res = await this.ticketsApi.createTicket({
        subject: this.newSubject.trim(),
        message: this.newMessage.trim(),
        orderId: this.newTicketType === 'order' ? this.newOrderId : undefined,
      });
      this.closeNewTicket();
      await this.refresh(res.id);
    } catch { /* sessiz */ }
    finally { this.busy.set(false); this.cdr.markForCheck(); }
  }
}
