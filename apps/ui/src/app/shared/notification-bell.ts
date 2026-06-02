import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification, NotificationsService } from '../core/notifications/notifications.service';

/**
 * Üst bar bildirim zili + açılır panel. Hem kullanıcı/bayi hem admin
 * layout'unda kullanılır. Okunmamış sayısı NotificationsService'ten gelir.
 */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="nb">
      <button class="nb__btn" type="button" aria-label="Bildirimler" (click)="toggle($event)">
        <i class="pi pi-bell"></i>
        @if (notifs.unreadTotal() > 0) {
          <span class="nb__badge">{{ notifs.unreadTotal() > 99 ? '99+' : notifs.unreadTotal() }}</span>
        }
      </button>

      @if (open()) {
        <div class="nb__panel" (click)="$event.stopPropagation()">
          <div class="nb__head">
            <span class="nb__title">Bildirimler</span>
            @if (notifs.unreadTotal() > 0) {
              <button class="nb__mark" type="button" (click)="markAll()">Tümünü okundu işaretle</button>
            }
          </div>

          <div class="nb__list">
            @if (loading() && notifs.items().length === 0) {
              <div class="nb__empty"><i class="pi pi-spin pi-spinner"></i><p>Yükleniyor…</p></div>
            } @else if (notifs.items().length === 0) {
              <div class="nb__empty"><i class="pi pi-inbox"></i><p>Bildirim yok</p></div>
            }
            @for (n of notifs.items(); track n.id) {
              <button type="button" class="nb__item" [class.nb__item--unread]="!n.read" (click)="onClick(n)">
                <span class="nb__dot" [class.nb__dot--on]="!n.read"></span>
                <span class="nb__icon" [class]="iconClass(n.type)"><i class="pi" [class]="icon(n.type)"></i></span>
                <span class="nb__body">
                  <span class="nb__item-title">{{ n.title }}</span>
                  @if (n.body) { <span class="nb__item-text">{{ n.body }}</span> }
                  <span class="nb__time">{{ timeAgo(n.createdAt) }}</span>
                </span>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .nb { position: relative; }
    .nb__btn {
      position: relative; width: 38px; height: 38px; border-radius: 10px;
      background: rgba(255,255,255,0.06); border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: rgba(255,255,255,0.65); transition: background 180ms, color 180ms;
      &:hover { background: rgba(255,255,255,0.1); color: #fff; }
      i { font-size: 1.05rem; }
    }
    .nb__badge {
      position: absolute; top: -4px; right: -4px; min-width: 17px; height: 17px;
      padding: 0 4px; border-radius: 9px; background: #e63946; color: #fff;
      font-size: 0.62rem; font-weight: 800; display: flex; align-items: center; justify-content: center;
      border: 2px solid #13151c;
    }
    .nb__panel {
      position: absolute; top: calc(100% + 10px); right: 0; width: 360px; max-width: 92vw;
      max-height: 460px; display: flex; flex-direction: column; z-index: 300;
      background: #13151c; border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
      box-shadow: 0 18px 50px rgba(0,0,0,0.5); overflow: hidden;
      animation: nbIn 160ms ease both;
    }
    @keyframes nbIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
    .nb__head {
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
      padding: 0.85rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .nb__title { font-size: 0.9rem; font-weight: 700; color: #fff; }
    .nb__mark { background: none; border: none; cursor: pointer; color: #60a5fa; font-size: 0.72rem; font-weight: 600; &:hover { opacity: 0.8; } }
    .nb__list { overflow-y: auto; display: flex; flex-direction: column; }
    .nb__empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2.5rem 1rem; color: rgba(255,255,255,0.35); font-size: 0.82rem; i { font-size: 1.6rem; color: rgba(255,255,255,0.2); } p { margin: 0; } }
    .nb__item {
      display: flex; align-items: flex-start; gap: 0.6rem; text-align: left; width: 100%;
      padding: 0.8rem 1rem; background: none; border: none; cursor: pointer;
      border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 140ms;
      &:hover { background: rgba(255,255,255,0.03); }
      &--unread { background: rgba(96,165,250,0.05); &:hover { background: rgba(96,165,250,0.09); } }
    }
    .nb__dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; background: transparent;
      &--on { background: #60a5fa; box-shadow: 0 0 6px #60a5fa88; } }
    .nb__icon { width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; i { font-size: 0.85rem; }
      &.nb__icon--order { background: rgba(230,57,70,0.14); color: #e63946; }
      &.nb__icon--ok    { background: rgba(74,222,128,0.14); color: #4ade80; }
      &.nb__icon--warn  { background: rgba(248,113,113,0.14); color: #f87171; }
      &.nb__icon--ticket{ background: rgba(167,139,250,0.14); color: #a78bfa; }
    }
    .nb__body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .nb__item-title { font-size: 0.82rem; font-weight: 600; color: #fff; }
    .nb__item-text { font-size: 0.75rem; color: rgba(255,255,255,0.55); line-height: 1.35; }
    .nb__time { font-size: 0.68rem; color: rgba(255,255,255,0.3); margin-top: 2px; }
  `],
})
export class NotificationBell {
  protected readonly notifs = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef) as ElementRef<HTMLElement>;

  protected readonly open = signal(false);
  protected readonly loading = signal(false);

  async toggle(ev: Event): Promise<void> {
    ev.stopPropagation();
    const next = !this.open();
    this.open.set(next);
    if (next) {
      this.loading.set(true);
      try { await this.notifs.loadItems(); }
      finally { this.loading.set(false); }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    const target = ev.target as Node | null;
    if (this.open() && target && !this.host.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }

  onClick(n: AppNotification): void {
    // Önce kapat + yönlendir; okundu işaretleme arka planda yapılır (gecikme yaratmaz).
    this.open.set(false);
    if (!n.read) { void this.notifs.markRead(n.id); }
    if (n.link) { void this.router.navigateByUrl(n.link); }
  }

  markAll(): void {
    void this.notifs.markAllRead();
  }

  icon(type: string): string {
    switch (type) {
      case 'order_completed': return 'pi-check-circle';
      case 'order_cancelled': return 'pi-times-circle';
      case 'new_order':
      case 'order_received': return 'pi-shopping-cart';
      case 'new_ticket':
      case 'ticket_replied':
      case 'ticket_user_replied': return 'pi-comments';
      default: return 'pi-bell';
    }
  }

  iconClass(type: string): string {
    if (type === 'order_completed') { return 'nb__icon nb__icon--ok'; }
    if (type === 'order_cancelled') { return 'nb__icon nb__icon--warn'; }
    if (type.startsWith('ticket') || type === 'new_ticket') { return 'nb__icon nb__icon--ticket'; }
    return 'nb__icon nb__icon--order';
  }

  timeAgo(iso: string): string {
    const d = new Date(iso).getTime();
    if (isNaN(d)) { return ''; }
    const diff = Math.max(0, Date.now() - d);
    const min = Math.floor(diff / 60000);
    if (min < 1) { return 'az önce'; }
    if (min < 60) { return `${min} dk önce`; }
    const hr = Math.floor(min / 60);
    if (hr < 24) { return `${hr} sa önce`; }
    const day = Math.floor(hr / 24);
    if (day < 7) { return `${day} gün önce`; }
    return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
  }
}
