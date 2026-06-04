import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type BillingType = 'individual' | 'corporate';

export interface Billing {
  type: BillingType;
  fullName: string | null;
  tcNo: string | null;
  companyName: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
}

export interface Account {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  dealershipName: string | null;
  billing: Billing | null;
  billingComplete: boolean;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  private readonly _account = signal<Account | null>(null);
  private readonly _loaded = signal(false);

  readonly account = this._account.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  /** Fatura bilgileri tam mı? Header uyarısı + sipariş engeli için. */
  readonly billingComplete = computed(() => this._account()?.billingComplete ?? false);

  async load(): Promise<void> {
    try {
      const a = await firstValueFrom(this.http.get<Account>(`${this.api}/account`));
      this._account.set(a);
    } catch { /* sessiz */ }
    finally { this._loaded.set(true); }
  }

  clear(): void { this._account.set(null); this._loaded.set(false); }

  async updateProfile(fullName: string, phone: string, dealershipName?: string): Promise<void> {
    const body: Record<string, string> = { fullName, phone };
    if (dealershipName !== undefined) { body['dealershipName'] = dealershipName; }
    await firstValueFrom(this.http.put(`${this.api}/account/profile`, body));
    await this.load();
  }

  async changePassword(newPassword: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/account/password`, { newPassword }));
  }

  async saveBilling(b: Billing): Promise<void> {
    await firstValueFrom(this.http.put(`${this.api}/account/billing`, b));
    await this.load();
  }

  async deleteBilling(): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.api}/account/billing`));
    await this.load();
  }
}
