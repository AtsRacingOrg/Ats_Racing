import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

type TicketStatus = 'open' | 'pending' | 'resolved';

interface Message { id: string; text: string; sender: 'user' | 'support'; time: string; }

interface AdminTicket {
  id: string; user: string; email: string;
  order: string; subject: string;
  status: TicketStatus; date: string;
  messages: Message[];
}

const MOCK_TICKETS: AdminTicket[] = [
  { id: 'TKT-003', user: 'Ali Yıldız',  email: 'kullanici@atsracing.com', order: 'ORD-003', subject: 'DPF ışığı hala yanıyor',
    status: 'open', date: '18 Mar 2026',
    messages: [
      { id: 'm1', sender: 'user',    time: '18 Mar, 09:00', text: 'DPF modülü yüklendi fakat gösterge panelinde DPF uyarı ışığı hala yanıyor.' },
    ],
  },
  { id: 'TKT-001', user: 'Ali Yıldız',  email: 'kullanici@atsracing.com', order: 'ORD-001', subject: 'Yazılım sonrası rölantide titreme',
    status: 'pending', date: '12 May 2026',
    messages: [
      { id: 'm2', sender: 'user',    time: '12 May, 10:30', text: 'Stage 1 yazılımı yüklendikten sonra rölantide hafif titreme başladı. Normal mi?' },
      { id: 'm3', sender: 'support', time: '12 May, 11:45', text: 'Titreme durumu birkaç gün içinde ECU adaptasyonu tamamlanınca geçmektedir.' },
      { id: 'm4', sender: 'user',    time: '13 May, 09:15', text: 'Tamam, biraz daha bekleyeyim. Teşekkürler.' },
    ],
  },
  { id: 'TKT-005', user: 'Mert Kaya',   email: 'mert@gmail.com',          order: 'ORD-047', subject: 'Stage 2 sonrası DTC kodları',
    status: 'open', date: '28 May 2026',
    messages: [
      { id: 'm5', sender: 'user',    time: '28 May, 14:00', text: 'Stage 2 yazılımı sonrasında P0299 ve P0234 kodları geliyor, araç boost basıncı aşıyor mu?' },
    ],
  },
  { id: 'TKT-002', user: 'Ali Yıldız',  email: 'kullanici@atsracing.com', order: 'ORD-002', subject: 'Stage 2 için intercooler tavsiyesi',
    status: 'resolved', date: '25 Nis 2026',
    messages: [
      { id: 'm6', sender: 'user',    time: '25 Nis, 14:00', text: 'Stage 2 yazılımı için hangi intercooler markasını önerirsiniz?' },
      { id: 'm7', sender: 'support', time: '25 Nis, 16:30', text: 'Wagner Tuning veya Forge Motorsport intercooler\'larını tavsiye ediyoruz.' },
    ],
  },
];

const STATUS_LABEL: Record<TicketStatus, string> = { open: 'Açık', pending: 'Beklemede', resolved: 'Çözüldü' };

@Component({
  selector: 'app-admin-tickets',
  standalone: true,
  imports: [DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="atk">
  <div class="atk__header">
    <div>
      <h1 class="atk__title">Ticketlar</h1>
      <p class="atk__sub">{{ tickets().length }} toplam · {{ openCount() }} açık</p>
    </div>
    <div class="atk__filters">
      <div class="atk-search">
        <i class="pi pi-search"></i>
        <input type="text" placeholder="Ticket veya kullanıcı ara…" [(ngModel)]="search" />
      </div>
      <div class="atk-fw">
        <select class="atk-filter" [(ngModel)]="filterStatus">
          <option value="">Tüm Durumlar</option>
          <option value="open">Açık</option>
          <option value="pending">Beklemede</option>
          <option value="resolved">Çözüldü</option>
        </select>
      </div>
    </div>
  </div>

  <div class="atk__layout">

    <!-- List -->
    <div class="atk__list">
      @for (t of filtered(); track t.id) {
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
    </div>

    <!-- Conversation -->
    <div class="atk__convo">
      @if (!active()) {
        <div class="atk__convo-empty">
          <i class="pi pi-comments"></i>
          <p>Cevaplamak için bir ticket seçin</p>
        </div>
      } @else {
        <div class="atk-convo__head">
          <div class="atk-convo__head-left">
            <span class="atk-badge atk-badge--{{ active()!.status }}">{{ statusLabel(active()!.status) }}</span>
            <div>
              <h2 class="atk-convo__subject">{{ active()!.subject }}</h2>
              <p class="atk-convo__meta">{{ active()!.user }} · {{ active()!.email }} · {{ active()!.order }}</p>
            </div>
          </div>
          @if (active()!.status !== 'resolved') {
            <button class="atk-ghost-btn" type="button" (click)="resolve(active()!.id)">
              <i class="pi pi-check"></i> Çözüldü Olarak Kapat
            </button>
          }
        </div>

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

        @if (active()!.status !== 'resolved') {
          <div class="atk-reply">
            <textarea class="atk-reply__input" rows="3" placeholder="Cevabınızı yazın…" [(ngModel)]="replyText"></textarea>
            <button class="atk-send-btn" type="button" [disabled]="!replyText.trim()" (click)="sendReply()">
              <i class="pi pi-send"></i> Gönder
            </button>
          </div>
        } @else {
          <div class="atk-resolved-note"><i class="pi pi-check-circle"></i> Bu ticket çözüldü olarak kapatılmıştır.</div>
        }
      }
    </div>

  </div>
</div>
  `,
  styles: [`
    .atk { display: flex; flex-direction: column; gap: 1.5rem; }
    .atk__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .atk__sub { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
    .atk__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .atk__filters { display: flex; gap: 0.75rem; flex-wrap: wrap; }

    .atk-search {
      display: flex; align-items: center; gap: 0.5rem;
      background: #13151c; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0 0.9rem;
      i { color: rgba(255,255,255,0.3); font-size: 0.8rem; }
      input { background: transparent; border: none; color: rgba(255,255,255,0.85); font-size: 0.85rem; padding: 0.6rem 0; width: 200px; &:focus { outline: none; } &::placeholder { color: rgba(255,255,255,0.2); } }
    }
    .atk-fw { position: relative; }
    .atk-filter { background: #13151c; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0.6rem 1rem; color: rgba(255,255,255,0.75); font-size: 0.8rem; cursor: pointer; appearance: none; min-width: 130px; option { background: #1a1d27; } }

    .atk__layout { display: grid; grid-template-columns: 320px 1fr; gap: 1.25rem; align-items: start; @media(max-width:860px){ grid-template-columns: 1fr; } }

    /* List */
    .atk__list { display: flex; flex-direction: column; gap: 0.5rem; }
    .atk-row {
      width: 100%; text-align: left; border: none; cursor: pointer;
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
      &--open    { background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
      &--pending { background: rgba(96,165,250,0.12); color: #60a5fa; border: 1px solid rgba(96,165,250,0.2); }
      &--resolved{ background: rgba(74,222,128,0.12); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
    }

    /* Conversation */
    .atk__convo { background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; min-height: 500px; }
    .atk__convo-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; color: rgba(255,255,255,0.2); i { font-size: 3rem; } p { font-size: 0.875rem; margin: 0; } }

    .atk-convo__head {
      display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;
      padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.07);
      &-left { display: flex; align-items: flex-start; gap: 0.75rem; }
    }
    .atk-convo__subject { font-size: 1rem; font-weight: 700; color: #fff; margin: 0 0 3px; }
    .atk-convo__meta { font-size: 0.72rem; color: rgba(255,255,255,0.35); margin: 0; }

    .atk-ghost-btn {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.9rem; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.12); background: transparent; color: rgba(255,255,255,0.6); font-size: 0.78rem; cursor: pointer;
      &:hover { border-color: rgba(74,222,128,0.4); color: #4ade80; }
    }

    .atk-messages { flex: 1; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; overflow-y: auto; max-height: 420px; }
    .atk-msg {
      display: flex; gap: 0.75rem;
      &--user { flex-direction: row-reverse; }
      &__avatar {
        width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700;
        &--support { background: rgba(245,158,11,0.15); color: #f59e0b; }
        &--user    { background: rgba(96,165,250,0.15); color: #60a5fa; }
      }
      &__body { display: flex; flex-direction: column; gap: 0.3rem; max-width: 72%; }
      &__meta { display: flex; align-items: center; gap: 0.5rem; }
      &__sender { font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.5); }
      &__time   { font-size: 0.68rem; color: rgba(255,255,255,0.25); }
      &__bubble { padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.85rem; line-height: 1.55; color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.07); }
      &--user &__meta { flex-direction: row-reverse; }
      &--user &__bubble { background: rgba(96,165,250,0.08); border-color: rgba(96,165,250,0.15); }
      &--support &__bubble { background: rgba(245,158,11,0.06); border-color: rgba(245,158,11,0.15); }
    }

    .atk-reply { padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.07); display: flex; gap: 0.75rem; align-items: flex-end; }
    .atk-reply__input { flex: 1; background: #0d0f14; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 0.75rem 1rem; color: rgba(255,255,255,0.85); font-size: 0.875rem; resize: none; font-family: inherit; &:focus { outline: none; border-color: rgba(245,158,11,0.4); } &::placeholder { color: rgba(255,255,255,0.2); } }
    .atk-send-btn { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; padding: 0.65rem 1.25rem; border-radius: 10px; border: none; cursor: pointer; background: linear-gradient(135deg,#f59e0b,#d97706); color: #000; font-size: 0.875rem; font-weight: 700; &:hover:not(:disabled) { opacity: 0.88; } &:disabled { opacity: 0.35; cursor: not-allowed; } }
    .atk-resolved-note { padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #4ade80; }
  `],
})
export class AdminTicketsPage {
  protected readonly tickets = signal<AdminTicket[]>(MOCK_TICKETS);
  protected search       = '';
  protected filterStatus = '';
  protected readonly activeId = signal<string | null>(null);
  protected replyText = '';

  protected readonly active = computed(() => this.tickets().find(t => t.id === this.activeId()) ?? null);
  protected readonly openCount = computed(() => this.tickets().filter(t => t.status !== 'resolved').length);
  protected readonly filtered = computed(() => {
    let list = this.tickets();
    if (this.search) { const q = this.search.toLowerCase(); list = list.filter(t => t.subject.toLowerCase().includes(q) || t.user.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)); }
    if (this.filterStatus) { list = list.filter(t => t.status === this.filterStatus); }
    return list;
  });

  statusLabel(s: TicketStatus): string { return STATUS_LABEL[s]; }
  userInitials(name: string): string { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

  sendReply(): void {
    const text = this.replyText.trim();
    if (!text || !this.activeId()) { return; }
    this.tickets.update(list => list.map(t =>
      t.id === this.activeId()
        ? { ...t, status: 'pending' as TicketStatus, messages: [...t.messages, { id: `m${Date.now()}`, sender: 'support' as const, text, time: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }] }
        : t
    ));
    this.replyText = '';
  }

  resolve(id: string): void {
    this.tickets.update(list => list.map(t => t.id === id ? { ...t, status: 'resolved' as TicketStatus } : t));
  }
}
