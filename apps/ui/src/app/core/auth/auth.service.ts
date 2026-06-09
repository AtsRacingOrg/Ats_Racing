import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrdersService } from '../orders/orders.service';
import { TicketsService } from '../tickets/tickets.service';
import { PaymentsService } from '../payments/payments.service';

export type UserRole = 'admin' | 'dealer' | 'user';
export type AccountType = 'user' | 'dealer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  avatar: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  country?: string;
  accountType: AccountType;
  dealershipName?: string;
}

interface LoginResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

const TOKEN_KEY = 'ats_access_token';
const REFRESH_KEY = 'ats_refresh_token';
const USER_KEY = 'ats_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;
  private readonly orders = inject(OrdersService);
  private readonly tickets = inject(TicketsService);
  private readonly payments = inject(PaymentsService);

  private readonly _user = signal<AuthUser | null>(this.loadUser());

  readonly currentUser = this._user.asReadonly();
  readonly isLoggedIn  = computed(() => !!this._user());
  readonly isAdmin     = computed(() => this._user()?.role === 'admin');
  readonly isDealer    = computed(() => this._user()?.role === 'dealer');

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /** Create a pending user/dealer account. Returns the server message. */
  async register(payload: RegisterPayload): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<{ message: string }>(`${this.api}/auth/register`, payload),
    );
    return res.message;
  }

  /** Authenticate. Throws (with a friendly message) on failure. */
  async login(email: string, password: string): Promise<AuthUser> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.api}/auth/login`, { email, password }),
    );
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this._user.set(res.user);
    return res.user;
  }

  /** Re-send the email verification link. */
  async resendVerification(email: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<{ message: string }>(`${this.api}/auth/resend-verification`, { email }),
    );
    return res.message;
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
    // Önceki kullanıcının verisi yeni oturuma sızmasın.
    this.orders.clearCache();
    this.tickets.clearCache();
    this.payments.clearCache();
  }

  /** Pull a human-readable message out of an HttpErrorResponse. */
  static messageFrom(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const m = err.error?.message;
      if (Array.isArray(m)) { return m[0] ?? 'İşlem başarısız.'; }
      if (typeof m === 'string') { return m; }
      if (err.status === 0) { return 'Sunucuya ulaşılamadı. Bağlantını kontrol et.'; }
    }
    return 'İşlem başarısız. Tekrar dene.';
  }

  private loadUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}
