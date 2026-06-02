import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth/auth.service';

/**
 * Bayilerin müşterilerinin yanında sipariş oluştururken fiyatları gizlemesi için
 * paylaşılan durum. Layout'taki düğme ile sayfa içerikleri aynı sinyali okur.
 * Varsayılan: bayi için gizli, diğerleri için açık.
 */
@Injectable({ providedIn: 'root' })
export class PrivacyService {
  private readonly auth = inject(AuthService);
  readonly pricesHidden = signal(this.auth.isDealer());
  toggle(): void { this.pricesHidden.update(v => !v); }
}
