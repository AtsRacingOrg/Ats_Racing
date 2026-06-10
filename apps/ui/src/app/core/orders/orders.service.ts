import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Swr } from '../../shared/swr';

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'failed';

/** Araçlar ekranından gönderilen sipariş yükü (fiyat server'da hesaplanır). */
export interface CreateOrderPayload {
  stage: 'stage1' | 'stage2' | 'stage3';
  engineId?: string | null;
  make?: string;
  model?: string;
  year?: string;
  engineLabel?: string;
  fuel?: string;
  transmission?: string;
  vin?: string;
  km?: string;
  plate?: string;
  ecu?: string;
  readingTool?: string;
  virtualFile?: boolean;
  dyno?: boolean;
  ecuHw?: string;
  ecuPart?: string;
  ecuSw?: string;
  notes?: string;
  serviceCodes?: string[];
  modifiedParts?: string[];
  pcodes?: { pcode?: string; note?: string }[];
}

export interface OrderItem { label: string; unitPrice: number; }
export interface OrderEvent { event: string; actorRole: string | null; createdAt: string; }
export interface OrderFile { kind: 'original' | 'delivered'; fileName: string; status: string; isDownloadable: boolean; notes: string | null; }

export interface Order {
  id: string;
  orderNo: string;
  createdAt: string;
  queuePosition: number | null;
  queueTotal: number;
  make: string | null;
  model: string | null;
  year: number | null;
  engineLabel: string | null;
  fuel: string | null;
  transmission: string | null;
  vin: string | null;
  km: string | null;
  plate: string | null;
  stage: string;
  ecu: string | null;
  readingTool: string | null;
  ecuHw: string | null;
  ecuPart: string | null;
  ecuSw: string | null;
  virtualFile: boolean;
  dyno: boolean;
  modifiedParts: string[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  notes: string | null;
  cancellationReason: string | null;
  basePrice: number;
  extrasTotal: number;
  totalPrice: number;
  items: OrderItem[];
  pcodes: { pcode: string | null; note: string | null }[];
  events: OrderEvent[];
  files: OrderFile[];
  customer?: { fullName: string | null; email: string | null; phone: string | null; role: string | null } | null;
}

export interface CreateOrderResult { id: string; orderNo: string; total: number; }

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /* Stale-while-revalidate önbellekleri — ekran açılışı anında. */
  private readonly _myOrders = new Swr<Order[]>();
  private readonly _adminOrders = new Swr<Order[]>();

  /** Sayfa açılışında anında göstermek için son veri (yoksa null). */
  peekMyOrders(): Order[] | null { return this._myOrders.peek(); }
  peekAdminOrders(): Order[] | null { return this._adminOrders.peek(); }

  /** Sipariş listesi değişen mutasyonlardan sonra cache'i geçersiz kıl. */
  private invalidateOrders(): void { this._myOrders.clear(); this._adminOrders.clear(); }

  /** Çıkışta tüm önbellekleri temizle. */
  clearCache(): void { this.invalidateOrders(); }

  createOrder(payload: CreateOrderPayload): Promise<CreateOrderResult> {
    return firstValueFrom(this.http.post<CreateOrderResult>(`${this.api}/orders`, payload))
      .then(r => { this.invalidateOrders(); return r; });
  }

  uploadOriginalFile(orderId: string, file: File): Promise<{ ok: boolean; fileName: string }> {
    const form = new FormData();
    form.append('file', file, file.name);
    return firstValueFrom(
      this.http.post<{ ok: boolean; fileName: string }>(`${this.api}/orders/${orderId}/file`, form),
    ).then(r => { this.invalidateOrders(); return r; });
  }

  listMyOrders(): Promise<Order[]> {
    return this._myOrders.revalidate(
      () => firstValueFrom(this.http.get<Order[]>(`${this.api}/orders`)),
    );
  }

  getOrder(id: string): Promise<Order> {
    return firstValueFrom(this.http.get<Order>(`${this.api}/orders/${id}`));
  }

  /* ── Admin ── */
  adminListOrders(): Promise<Order[]> {
    return this._adminOrders.revalidate(
      () => firstValueFrom(this.http.get<Order[]>(`${this.api}/admin/orders`)),
    );
  }

  adminUpdateStatus(id: string, status: OrderStatus, reason?: string): Promise<Order> {
    const body: { status: OrderStatus; reason?: string } = { status };
    if (reason && reason.trim()) { body.reason = reason.trim(); }
    return firstValueFrom(
      this.http.post<Order>(`${this.api}/admin/orders/${id}/status`, body),
    ).then(r => { this.invalidateOrders(); return r; });
  }

  adminDeliverFile(id: string, file: File, note?: string): Promise<Order> {
    const form = new FormData();
    form.append('file', file, file.name);
    if (note && note.trim()) { form.append('note', note.trim()); }
    return firstValueFrom(this.http.post<Order>(`${this.api}/admin/orders/${id}/deliver`, form))
      .then(r => { this.invalidateOrders(); return r; });
  }

  adminUpdateDeliveredNote(id: string, note: string): Promise<Order> {
    return firstValueFrom(
      this.http.post<Order>(`${this.api}/admin/orders/${id}/delivered-note`, { note: note.trim() || null }),
    ).then(r => { this.invalidateOrders(); return r; });
  }

  /** Dosya için imzalı indirme linki (kind: delivered/original). */
  getDownloadUrl(id: string, kind: 'original' | 'delivered' = 'delivered'): Promise<{ url: string; fileName: string }> {
    return firstValueFrom(
      this.http.get<{ url: string; fileName: string }>(`${this.api}/orders/${id}/download`, { params: { kind } }),
    );
  }
}
