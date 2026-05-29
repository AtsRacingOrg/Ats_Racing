import { Injectable, signal, computed } from '@angular/core';

export type UserRole = 'admin' | 'dealer' | 'user';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  avatar: string;
}

/* ── Static accounts ─────────────────────────────────────── */
const STATIC_USERS: (AuthUser & { password: string })[] = [
  {
    id: 'u-admin',
    name: 'Admin',
    email: 'admin@atsracing.com',
    password: 'admin123',
    role: 'admin',
    avatar: 'AD',
  },
  {
    id: 'u-dealer',
    name: 'Ahmet Yılmaz',
    email: 'bayi@atsracing.com',
    password: 'bayi123',
    role: 'dealer',
    company: 'ATS Bayi İstanbul',
    avatar: 'AY',
  },
  {
    id: 'u-user',
    name: 'Ali Yıldız',
    email: 'kullanici@atsracing.com',
    password: 'user123',
    role: 'user',
    avatar: 'AY',
  },
];

const STORAGE_KEY = 'ats_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<AuthUser | null>(this._loadFromStorage());

  readonly currentUser = this._user.asReadonly();
  readonly isLoggedIn  = computed(() => !!this._user());
  readonly isAdmin     = computed(() => this._user()?.role === 'admin');
  readonly isDealer    = computed(() => this._user()?.role === 'dealer');

  login(email: string, password: string): AuthUser | null {
    const found = STATIC_USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) { return null; }
    const { password: _pw, ...user } = found;
    this._user.set(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  }

  logout(): void {
    this._user.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private _loadFromStorage(): AuthUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
