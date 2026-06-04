import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { PageLoader } from '../../../../shared/page-loader';
import { Paginator } from '../../../../shared/paginator';
import { FormsModule } from '@angular/forms';
import { TicketsService, Ticket as ApiTicket } from '../../../../core/tickets/tickets.service';
import { formatTrDate, formatTrDateTime } from '../../../../core/orders/order-format';

type TicketStatus = 'open' | 'pending' | 'resolved';

interface Message { id: string; text: string; sender: 'user' | 'support'; time: string; }

interface AdminTicket {
  id: string; ticketNo: string; user: string; email: string;
  order: string; subject: string;
  status: TicketStatus; date: string;
  messages: Message[];
}


function mapAdminTicket(t: ApiTicket): AdminTicket {
  return {
    id: t.id,
    ticketNo: t.ticketNo,
    user: t.customer?.fullName ?? '—',
    email: t.customer?.email ?? '',
    order: t.orderNo ?? 'Özel Talep',
    subject: t.subject,
    status: t.status,
    date: formatTrDate(t.createdAt),
    messages: t.messages.map((m, i) => ({
      id: `m${i}`,
      text: m.body,
      sender: m.sender,
      time: formatTrDateTime(m.createdAt),
    })),
  };
}

const STATUS_LABEL: Record<TicketStatus, string> = { open: 'Açık', pending: 'Beklemede', resolved: 'Çözüldü' };

@Component({
  selector: 'app-admin-tickets',
  standalone: true,
  imports: [FormsModule, PageLoader, Paginator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
@if (loading()) { <app-page-loader /> } @else {
<div class="atk">
  <div class="atk__header">
    <div>
      <h1 class="atk__title">Ticketlar</h1>
      <p class="atk__sub">{{ tickets().length }} toplam</p>
    </div>
    <div class="atk-search">
      <i class="pi pi-search"></i>
      <input type="text" placeholder="Ticket veya kullanıcı ara…"
        [ngModel]="search()" (ngModelChange)="search.set($event)" />
    </div>
  </div>

  <!-- Status tabs -->
  <div class="atk__tabs">
    <button class="atk-tab" [class.atk-tab--active]="activeStatus() === ''"         type="button" (click)="activeStatus.set('')">
      Tümü <span class="atk-tab__count">{{ tickets().length }}</span>
    </button>
    <button class="atk-tab atk-tab--open"     [class.atk-tab--active]="activeStatus() === 'open'"     type="button" (click)="activeStatus.set('open')">
      <span class="atk-dot atk-dot--open"></span> Açık <span class="atk-tab__count">{{ countBy('open') }}</span>
    </button>
    <button class="atk-tab atk-tab--pending"  [class.atk-tab--active]="activeStatus() === 'pending'"  type="button" (click)="activeStatus.set('pending')">
      <span class="atk-dot atk-dot--pending"></span> Beklemede <span class="atk-tab__count">{{ countBy('pending') }}</span>
    </button>
    <button class="atk-tab atk-tab--resolved" [class.atk-tab--active]="activeStatus() === 'resolved'" type="button" (click)="activeStatus.set('resolved')">
      <span class="atk-dot atk-dot--resolved"></span> Çözüldü <span class="atk-tab__count">{{ countBy('resolved') }}</span>
    </button>
  </div>

  <div class="atk__layout">

    <!-- Ticket list -->
    <div class="atk__list">
      @for (t of paged(); track t.id) {
        <button type="button" class="atk-row" [class.atk-row--active]="activeId() === t.id" (click)="activeId.set(t.id)">
          <div class="atk-row__top">
            <span class="atk-badge atk-badge--{{ t.status }}">{{ statusLabel(t.status) }}</span>
            <span class="atk-row__date">{{ t.date }}</span>
          </div>
          <p class="atk-row__subject">{{ t.subject }}</p>
          <p class="atk-row__meta"><i class="pi pi-user"></i> {{ t.user }} · <i class="pi pi-box"></i> {{ t.order }}</p>
          <p class="atk-row__preview">{{ t.messages[t.messages.length - 1].text }}</p>
        </button>
      }
      @if (filtered().length === 0) {
        <div class="atk__list-empty"><i class="pi pi-inbox"></i><p>Ticket bulunamadı</p></div>
      }
      <app-paginator [total]="filtered().length" [(page)]="page" [pageSize]="pageSize" />
    </div>

    <!-- Conversation -->
    <div class="atk__convo">
      @if (!active()) {
        <div class="atk__convo-empty">
          <i class="pi pi-comments"></i>
          <p>Cevaplamak için bir ticket seçin</p>
        </div>
      } @else {
        <!-- Head -->
        <div class="atk-convo__head">
          <div class="atk-convo__head-left">
            <div>
              <h2 class="atk-convo__subject">{{ active()!.subject }}</h2>
              <p class="atk-convo__meta">{{ active()!.user }} · {{ active()!.email }} · {{ active()!.order }}</p>
            </div>
          </div>
          <!-- Status change controls -->
          <div class="atk-convo__status-ctrl">
            <span class="atk-badge atk-badge--{{ active()!.status }}">{{ statusLabel(active()!.status) }}</span>
            <div class="atk-status-actions">
              @if (active()!.status !== 'open') {
                <button class="atk-status-btn atk-status-btn--open" type="button" (click)="changeStatus(active()!.id, 'open')">
                  <span class="atk-dot atk-dot--open"></span> Açık
                </button>
              }
              @if (active()!.status !== 'pending') {
                <button class="atk-status-btn atk-status-btn--pending" type="button" (click)="changeStatus(active()!.id, 'pending')">
                  <span class="atk-dot atk-dot--pending"></span> Beklemede
                </button>
              }
              @if (active()!.status !== 'resolved') {
                <button class="atk-status-btn atk-status-btn--resolved" type="button" (click)="changeStatus(active()!.id, 'resolved')">
                  <i class="pi pi-check"></i> Çözüldü
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Messages -->
        <div class="atk-messages">
          @for (msg of active()!.messages; track msg.id) {
            <div class="atk-msg" [class.atk-msg--user]="msg.sender === 'user'" [class.atk-msg--support]="msg.sender === 'support'">
              <div class="atk-msg__avatar" [class.atk-msg__avatar--support]="msg.sender === 'support'" [class.atk-msg__avatar--user]="msg.sender === 'user'">
                {{ msg.sender === 'support' ? 'AD' : userInitials(active()!.user) }}
              </div>
              <div class="atk-msg__body">
                <div class="atk-msg__meta">
                  <span class="atk-msg__sender">{{ msg.sender === 'support' ? 'Destek Ekibi' : active()!.user }}</span>
                  <span class="atk-msg__time">{{ msg.time }}</span>
                </div>
                <div class="atk-msg__bubble">{{ msg.text }}</div>
              </div>
            </div>
          }
        </div>

        <!-- Reply -->
        @if (active()!.status !== 'resolved') {
          <div class="atk-reply">
            <textarea class="atk-reply__input" rows="3" placeholder="Cevabınızı yazın…" [(ngModel)]="replyText"></textarea>
            <button class="atk-send-btn" type="button" [disabled]="!replyText.trim() || busy()" (click)="sendReply()">
              <i class="pi" [class.pi-send]="!busy()" [class.pi-spin]="busy()" [class.pi-spinner]="busy()"></i>
              {{ busy() ? 'Gönderiliyor…' : 'Gönder' }}
            </button>
          </div>
        } @else {
          <div class="atk-resolved-note">
            <i class="pi pi-check-circle"></i> Bu ticket çözüldü olarak kapatılmıştır.
            <button class="atk-reopen-btn" type="button" (click)="changeStatus(active()!.id, 'open')">
              <i class="pi pi-refresh"></i> Yeniden Aç
            </button>
          </div>
        }
      }
    </div>

  </div>
</div>
}
  `,
  styles: [`
    .atk { display: flex; flex-direction: column; gap: 1.25rem; }
    .atk__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .atk__sub { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
    .atk__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }

    .atk-search {
      display: flex; align-items: center; gap: 0.5rem;
      background: #13151c; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0 0.9rem;
      i { color: rgba(255,255,255,0.3); font-size: 0.8rem; }
      input { background: transparent; border: none; color: rgba(255,255,255,0.85); font-size: 0.85rem; padding: 0.6rem 0; width: 220px; &:focus { outline: none; } &::placeholder { color: rgba(255,255,255,0.2); } }
    }

    /* ── Tabs ── */
    .atk__tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; padding-bottom: 0; border-bottom: 1px solid rgba(255,255,255,0.07); }
    .atk-tab {
      display: flex; align-items: center; gap: 0.45rem; padding: 0.6rem 1rem; border-radius: 10px 10px 0 0; border: none; cursor: pointer;
      background: transparent; color: rgba(255,255,255,0.4); font-size: 0.82rem; font-weight: 500; transition: all 160ms;
      &:hover { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.8); }
      &--active { color: #fff; border-bottom: 2px solid #f59e0b; background: rgba(245,158,11,0.07); }
      &__count { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; border-radius: 10px; padding: 0 5px; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); font-size: 0.68rem; font-weight: 700; }
    }
    .atk-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50; border-radius: 50%;
      &--open     { background: #fbbf24; }
      &--pending  { background: #60a5fa; box-shadow: 0 0 4px #60a5fa88; }
      &--resolved { background: #4ade80; }
    }

    /* ── Layout ── */
    .atk__layout { display: grid; grid-template-columns: 320px 1fr; gap: 1.25rem; align-items: start; height: calc(100vh - 230px); min-height: 480px; @media(max-width:860px){ grid-template-columns: 1fr; height: auto; } }

    /* ── Ticket list ── */
    .atk__list { display: flex; flex-direction: column; gap: 0.5rem; height: 100%; min-height: 0; overflow-y: auto; padding-right: 4px;
      @media(max-width:860px){ height: auto; max-height: 60vh; }
    }
    .atk__list-empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2.5rem; color: rgba(255,255,255,0.2); i { font-size: 2rem; } p { font-size: 0.8rem; margin: 0; } }
    .atk-row {
      width: 100%; text-align: left; cursor: pointer;
      background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 1rem;
      display: flex; flex-direction: column; gap: 0.3rem; transition: border-color 180ms;
      &:hover { border-color: rgba(255,255,255,0.14); }
      &--active { border-color: rgba(245,158,11,0.4); background: rgba(245,158,11,0.04); }
      &__top { display: flex; align-items: center; justify-content: space-between; }
      &__date { font-size: 0.7rem; color: rgba(255,255,255,0.3); }
      &__subject { font-size: 0.85rem; font-weight: 600; color: #fff; margin: 0; }
      &__meta { font-size: 0.7rem; color: rgba(255,255,255,0.3); margin: 0; display: flex; align-items: center; gap: 0.35rem; i { font-size: 0.65rem; } }
      &__preview { font-size: 0.72rem; color: rgba(255,255,255,0.25); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    }

    .atk-badge {
      display: inline-flex; padding: 0.18rem 0.55rem; border-radius: 6px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
      &--open     { background: rgba(251,191,36,0.12);  color: #fbbf24; border: 1px solid rgba(251,191,36,0.2);  }
      &--pending  { background: rgba(96,165,250,0.12);  color: #60a5fa; border: 1px solid rgba(96,165,250,0.2);  }
      &--resolved { background: rgba(74,222,128,0.12);  color: #4ade80; border: 1px solid rgba(74,222,128,0.2);  }
    }

    /* ── Conversation ── */
    .atk__convo { background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; height: 100%; min-height: 480px; @media(max-width:860px){ height: 70vh; } }
    .atk__convo-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; color: rgba(255,255,255,0.2); i { font-size: 3rem; } p { font-size: 0.875rem; margin: 0; } }

    .atk-convo__head {
      display: flex; flex-direction: column; gap: 0.75rem;
      padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.07);
      &-left { display: flex; align-items: flex-start; gap: 0.75rem; }
    }
    .atk-convo__subject { font-size: 1rem; font-weight: 700; color: #fff; margin: 0 0 3px; }
    .atk-convo__meta { font-size: 0.72rem; color: rgba(255,255,255,0.35); margin: 0; }

    .atk-convo__status-ctrl { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .atk-status-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-left: auto; }
    .atk-status-btn {
      display: flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.75rem; border-radius: 7px; border: none; cursor: pointer; font-size: 0.75rem; font-weight: 600; transition: all 160ms;
      &--open     { background: rgba(251,191,36,0.1);  color: #fbbf24; border: 1px solid rgba(251,191,36,0.2);  &:hover { background: rgba(251,191,36,0.2);  } }
      &--pending  { background: rgba(96,165,250,0.1);  color: #60a5fa; border: 1px solid rgba(96,165,250,0.2);  &:hover { background: rgba(96,165,250,0.2);  } }
      &--resolved { background: rgba(74,222,128,0.1);  color: #4ade80; border: 1px solid rgba(74,222,128,0.2);  &:hover { background: rgba(74,222,128,0.2);  } }
      i { font-size: 0.7rem; }
    }

    .atk-messages { flex: 1; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; overflow-y: auto; max-height: 420px; }
    .atk-msg {
      display: flex; gap: 0.75rem;
      &--support { flex-direction: row-reverse; }
      &__avatar { width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700;
        &--support { background: rgba(245,158,11,0.15); color: #f59e0b; }
        &--user    { background: rgba(96,165,250,0.15); color: #60a5fa; }
      }
      &__body { display: flex; flex-direction: column; gap: 0.3rem; max-width: 72%; }
      &__meta { display: flex; align-items: center; gap: 0.5rem; }
      &__sender { font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.5); }
      &__time   { font-size: 0.68rem; color: rgba(255,255,255,0.25); }
      &__bubble { padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.85rem; line-height: 1.55; color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.07); }
      &--support &__meta { flex-direction: row-reverse; }
      &--support &__bubble { background: rgba(245,158,11,0.06); border-color: rgba(245,158,11,0.15); }
      &--user &__bubble { background: rgba(96,165,250,0.08); border-color: rgba(96,165,250,0.15); }
    }

    .atk-reply { padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.07); display: flex; gap: 0.75rem; align-items: flex-end; }
    .atk-reply__input { flex: 1; background: #0d0f14; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 0.75rem 1rem; color: rgba(255,255,255,0.85); font-size: 0.875rem; resize: none; font-family: inherit; &:focus { outline: none; border-color: rgba(245,158,11,0.4); } &::placeholder { color: rgba(255,255,255,0.2); } }
    .atk-send-btn { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; padding: 0.65rem 1.25rem; border-radius: 10px; border: none; cursor: pointer; background: linear-gradient(135deg,#f59e0b,#d97706); color: #000; font-size: 0.875rem; font-weight: 700; &:hover:not(:disabled) { opacity: 0.88; } &:disabled { opacity: 0.35; cursor: not-allowed; } }

    .atk-resolved-note { padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #4ade80; flex-wrap: wrap; }
    .atk-reopen-btn { display: flex; align-items: center; gap: 0.35rem; margin-left: auto; padding: 0.35rem 0.75rem; border-radius: 7px; border: 1px solid rgba(251,191,36,0.2); background: rgba(251,191,36,0.08); color: #fbbf24; font-size: 0.75rem; cursor: pointer; &:hover { background: rgba(251,191,36,0.15); } i { font-size: 0.7rem; } }
  `],
})
export class AdminTicketsPage implements OnInit {
  private readonly ticketsApi = inject(TicketsService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly tickets      = signal<AdminTicket[]>([]);
  protected readonly activeStatus = signal<TicketStatus | ''>('');
  protected readonly search       = signal('');
  protected readonly activeId     = signal<string | null>(null);
  protected readonly busy         = signal(false);
  protected readonly loading      = signal(true);
  protected replyText = '';

  ngOnInit(): void {
    const cached = this.ticketsApi.peekAdminTickets();
    if (cached) { this.tickets.set(cached.map(mapAdminTicket)); this.loading.set(false); }

    this.ticketsApi.adminListTickets()
      .then(data => this.tickets.set(data.map(mapAdminTicket)))
      .catch(() => { /* sessiz */ })
      .finally(() => { this.loading.set(false); this.cdr.markForCheck(); });
  }

  protected readonly active = computed(() => this.tickets().find(t => t.id === this.activeId()) ?? null);
  protected countBy(s: TicketStatus): number { return this.tickets().filter(t => t.status === s).length; }

  protected readonly filtered = computed(() => {
    let list = this.tickets();
    const q = this.search().toLowerCase();
    if (q) { list = list.filter(t => t.subject.toLowerCase().includes(q) || t.user.toLowerCase().includes(q) || t.ticketNo.toLowerCase().includes(q)); }
    const status = this.activeStatus();
    if (status) { list = list.filter(t => t.status === status); }
    return list;
  });

  protected readonly pageSize = 10;
  protected readonly page = signal(1);
  protected readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });
  private readonly _resetPage = effect(() => {
    this.search(); this.activeStatus();
    this.page.set(1);
  });

  statusLabel(s: TicketStatus): string { return STATUS_LABEL[s]; }
  userInitials(name: string): string { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

  private upsert(t: AdminTicket): void {
    this.tickets.update(list => list.map(x => x.id === t.id ? t : x));
  }

  async changeStatus(id: string, status: TicketStatus): Promise<void> {
    if (this.busy()) { return; }
    this.busy.set(true);
    try {
      this.upsert(mapAdminTicket(await this.ticketsApi.adminSetStatus(id, status)));
    } catch { /* sessiz */ }
    finally { this.busy.set(false); this.cdr.markForCheck(); }
  }

  async sendReply(): Promise<void> {
    const text = this.replyText.trim();
    const id = this.activeId();
    if (!text || !id || this.busy()) { return; }
    this.busy.set(true);
    try {
      this.upsert(mapAdminTicket(await this.ticketsApi.adminReply(id, text)));
      this.replyText = '';
    } catch { /* sessiz */ }
    finally { this.busy.set(false); this.cdr.markForCheck(); }
  }
}
