import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  category: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationSummary {
  total: number;
  byCategory: Record<string, number>;
}

/**
 * Bildirim durumu — üst bar zili + menü rozetleri için ortak kaynak.
 * Login sonrası `start()` çağrılır; periyodik olarak özet yenilenir.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  private readonly _summary = signal<NotificationSummary>({ total: 0, byCategory: {} });
  private readonly _items = signal<AppNotification[]>([]);
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Okunmamış toplam (üst bar zili rozeti). */
  readonly unreadTotal = computed(() => this._summary().total);
  /** Kategori bazlı okunmamış (menü rozetleri: orders / tickets). */
  readonly byCategory = computed(() => this._summary().byCategory);
  readonly items = this._items.asReadonly();

  unreadFor(category: string): number {
    return this._summary().byCategory[category] ?? 0;
  }

  /** Periyodik özet yenilemeyi başlatır (idempotent). */
  start(): void {
    void this.refreshSummary();
    if (this.timer) { return; }
    this.timer = setInterval(() => void this.refreshSummary(), 30_000);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this._summary.set({ total: 0, byCategory: {} });
    this._items.set([]);
  }

  async refreshSummary(): Promise<void> {
    try {
      const s = await firstValueFrom(
        this.http.get<NotificationSummary>(`${this.api}/notifications/summary`),
      );
      this._summary.set(s ?? { total: 0, byCategory: {} });
    } catch { /* sessiz — login yoksa 401 olabilir */ }
  }

  async loadItems(): Promise<void> {
    try {
      const list = await firstValueFrom(
        this.http.get<AppNotification[]>(`${this.api}/notifications`),
      );
      this._items.set(list ?? []);
    } catch { /* sessiz */ }
  }

  async markRead(id: string): Promise<void> {
    // Optimistik: rozet/anında güncellensin, ağ arka planda.
    const target = this._items().find(n => n.id === id);
    if (target && !target.read) {
      this._items.update(list => list.map(n => n.id === id ? { ...n, read: true } : n));
      this._summary.update(s => this.decrement(s, target.category, 1));
    }
    try {
      await firstValueFrom(this.http.post(`${this.api}/notifications/${id}/read`, {}));
    } catch { void this.refreshSummary(); }
  }

  async markAllRead(category?: string): Promise<void> {
    // Optimistik güncelleme.
    this._items.update(list => list.map(n =>
      !category || n.category === category ? { ...n, read: true } : n));
    this._summary.update(s => {
      if (!category) { return { total: 0, byCategory: {} }; }
      const byCategory = { ...s.byCategory };
      const removed = byCategory[category] ?? 0;
      delete byCategory[category];
      return { total: Math.max(0, s.total - removed), byCategory };
    });
    try {
      await firstValueFrom(
        this.http.post(`${this.api}/notifications/read-all`, category ? { category } : {}),
      );
    } catch { void this.refreshSummary(); }
  }

  private decrement(s: NotificationSummary, category: string, by: number): NotificationSummary {
    const byCategory = { ...s.byCategory };
    byCategory[category] = Math.max(0, (byCategory[category] ?? 0) - by);
    if (byCategory[category] === 0) { delete byCategory[category]; }
    return { total: Math.max(0, s.total - by), byCategory };
  }
}
