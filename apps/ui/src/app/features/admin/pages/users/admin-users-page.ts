import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

type UserRole   = 'user' | 'dealer';
type UserStatus = 'active' | 'passive';

interface AdminUser {
  id: string; name: string; email: string;
  role: UserRole; status: UserStatus;
  company?: string; orders: number; joinDate: string; lastLogin: string;
}

const MOCK_USERS: AdminUser[] = [
  { id: 'U001', name: 'Ali Yıldız',      email: 'kullanici@atsracing.com', role: 'user',   status: 'active',  orders: 3,  joinDate: '10 Oca 2026', lastLogin: '29 May 2026' },
  { id: 'U002', name: 'Mert Kaya',       email: 'mert@gmail.com',          role: 'user',   status: 'active',  orders: 7,  joinDate: '5 Şub 2026',  lastLogin: '28 May 2026' },
  { id: 'U003', name: 'Selin Demir',     email: 'selin@hotmail.com',       role: 'user',   status: 'active',  orders: 2,  joinDate: '20 Şub 2026', lastLogin: '27 May 2026' },
  { id: 'U004', name: 'Emre Şahin',      email: 'emre@outlook.com',        role: 'user',   status: 'passive', orders: 1,  joinDate: '1 Mar 2026',  lastLogin: '15 Nis 2026' },
  { id: 'U005', name: 'Zeynep Arslan',   email: 'zeynep@gmail.com',        role: 'user',   status: 'active',  orders: 5,  joinDate: '12 Mar 2026', lastLogin: '28 May 2026' },
  { id: 'U006', name: 'Ahmet Yılmaz',    email: 'bayi@atsracing.com',      role: 'dealer', status: 'active',  orders: 48, joinDate: '1 Oca 2026',  lastLogin: '29 May 2026', company: 'ATS Bayi İstanbul' },
  { id: 'U007', name: 'Turan Çelik',     email: 'turan@bayiankara.com',    role: 'dealer', status: 'active',  orders: 31, joinDate: '15 Oca 2026', lastLogin: '28 May 2026', company: 'Speed Tuning Ankara' },
  { id: 'U008', name: 'Berk Öztürk',     email: 'berk@gmail.com',          role: 'user',   status: 'active',  orders: 0,  joinDate: '20 May 2026', lastLogin: '21 May 2026' },
];

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="au">
  <div class="au__header">
    <div>
      <h1 class="au__title">Kullanıcılar & Bayiler</h1>
      <p class="au__sub">{{ filtered().length }} kayıt listeleniyor</p>
    </div>
    <div class="au__actions">
      <div class="au-search">
        <i class="pi pi-search"></i>
        <input type="text" placeholder="İsim veya e-posta ara…" [(ngModel)]="search" />
      </div>
      <div class="au-filter-wrap">
        <select class="au-filter" [(ngModel)]="filterRole">
          <option value="">Tüm Roller</option>
          <option value="user">Kullanıcı</option>
          <option value="dealer">Bayi</option>
        </select>
      </div>
      <div class="au-filter-wrap">
        <select class="au-filter" [(ngModel)]="filterStatus">
          <option value="">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="passive">Pasif</option>
        </select>
      </div>
    </div>
  </div>

  <div class="au-table-wrap">
    <table class="au-table">
      <thead><tr>
        <th>Kullanıcı</th>
        <th>Rol</th>
        <th>Firma</th>
        <th>Sipariş</th>
        <th>Durum</th>
        <th>Kayıt Tarihi</th>
        <th>Son Giriş</th>
        <th></th>
      </tr></thead>
      <tbody>
        @for (u of filtered(); track u.id) {
          <tr>
            <td>
              <div class="au-user-cell">
                <div class="au-avatar" [class.au-avatar--dealer]="u.role === 'dealer'">
                  {{ u.name.split(' ').map(w => w[0]).join('').slice(0,2) }}
                </div>
                <div>
                  <p class="au-user-cell__name">{{ u.name }}</p>
                  <p class="au-user-cell__email">{{ u.email }}</p>
                </div>
              </div>
            </td>
            <td>
              <span class="au-badge" [class.au-badge--dealer]="u.role === 'dealer'" [class.au-badge--user]="u.role === 'user'">
                {{ u.role === 'dealer' ? 'Bayi' : 'Kullanıcı' }}
              </span>
            </td>
            <td class="au-muted">{{ u.company || '—' }}</td>
            <td class="au-center">{{ u.orders }}</td>
            <td>
              <span class="au-status" [class.au-status--active]="u.status === 'active'" [class.au-status--passive]="u.status === 'passive'">
                <span class="au-status__dot"></span>
                {{ u.status === 'active' ? 'Aktif' : 'Pasif' }}
              </span>
            </td>
            <td class="au-muted">{{ u.joinDate }}</td>
            <td class="au-muted">{{ u.lastLogin }}</td>
            <td>
              <div class="au-row-actions">
                <button class="au-icon-btn" title="Düzenle" (click)="toggleStatus(u)">
                  <i class="pi" [class.pi-eye]="u.status==='passive'" [class.pi-eye-slash]="u.status==='active'"></i>
                </button>
              </div>
            </td>
          </tr>
        }
      </tbody>
    </table>
  </div>
</div>
  `,
  styles: [`
    .au { display: flex; flex-direction: column; gap: 1.5rem; }
    .au__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .au__sub { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
    .au__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .au__actions { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }

    .au-search {
      display: flex; align-items: center; gap: 0.5rem;
      background: #13151c; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0 0.9rem;
      i { color: rgba(255,255,255,0.3); font-size: 0.8rem; flex-shrink: 0; }
      input { background: transparent; border: none; color: rgba(255,255,255,0.85); font-size: 0.85rem; padding: 0.6rem 0; width: 200px;
        &:focus { outline: none; } &::placeholder { color: rgba(255,255,255,0.2); }
      }
    }
    .au-filter-wrap { position: relative; }
    .au-filter {
      background: #13151c; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
      padding: 0.6rem 1rem; color: rgba(255,255,255,0.75); font-size: 0.8rem; cursor: pointer; appearance: none; min-width: 130px;
      option { background: #1a1d27; }
    }

    .au-table-wrap { background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; overflow: auto; }
    .au-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; min-width: 700px;
      th { color: rgba(255,255,255,0.3); font-weight: 600; text-transform: uppercase; font-size: 0.65rem; letter-spacing: .05em; padding: 1rem 1.25rem 0.75rem; text-align: left; }
      td { padding: 0.9rem 1.25rem; border-top: 1px solid rgba(255,255,255,0.05); vertical-align: middle; color: rgba(255,255,255,0.8); }
      tr:hover td { background: rgba(255,255,255,0.02); }
    }
    .au-center { text-align: center; font-weight: 700; color: #fff; }
    .au-muted { color: rgba(255,255,255,0.35) !important; font-size: 0.78rem; }

    .au-user-cell { display: flex; align-items: center; gap: 0.75rem;
      &__name { font-size: 0.85rem; font-weight: 600; color: #fff; margin: 0 0 2px; }
      &__email { font-size: 0.72rem; color: rgba(255,255,255,0.35); margin: 0; }
    }
    .au-avatar {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      background: rgba(96,165,250,0.15); color: #60a5fa;
      display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700;
      &--dealer { background: rgba(245,158,11,0.15); color: #f59e0b; }
    }

    .au-badge {
      display: inline-flex; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
      &--user   { background: rgba(96,165,250,0.1); color: #60a5fa; border: 1px solid rgba(96,165,250,0.2); }
      &--dealer { background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); }
    }
    .au-status { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem;
      &__dot { width: 7px; height: 7px; border-radius: 50%; }
      &--active  .au-status__dot { background: #4ade80; box-shadow: 0 0 6px #4ade8088; }
      &--passive .au-status__dot { background: rgba(255,255,255,0.2); }
      &--active  { color: #4ade80; } &--passive { color: rgba(255,255,255,0.35); }
    }
    .au-row-actions { display: flex; gap: 0.4rem; justify-content: flex-end; }
    .au-icon-btn {
      width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
      background: transparent; color: rgba(255,255,255,0.4); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;
      &:hover { background: rgba(255,255,255,0.08); color: #fff; }
    }
  `],
})
export class AdminUsersPage {
  protected readonly allUsers = signal<AdminUser[]>(MOCK_USERS);
  protected search       = '';
  protected filterRole   = '';
  protected filterStatus = '';

  protected readonly filtered = computed(() => {
    let list = this.allUsers();
    if (this.search)       { const q = this.search.toLowerCase(); list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)); }
    if (this.filterRole)   { list = list.filter(u => u.role === this.filterRole); }
    if (this.filterStatus) { list = list.filter(u => u.status === this.filterStatus); }
    return list;
  });

  toggleStatus(u: AdminUser): void {
    this.allUsers.update(list => list.map(x => x.id === u.id ? { ...x, status: x.status === 'active' ? 'passive' : 'active' } : x));
  }
}
