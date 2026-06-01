import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUserRow } from '../../../../core/admin/admin.service';
import { stageLabel, formatTl, formatTrDate } from '../../../../core/orders/order-format';

type UserRole   = 'user' | 'dealer' | 'admin';
type AccountStatus = 'approved' | 'pending' | 'rejected';

interface OrderRef { id: string; vehicle: string; stage: string; date: string; price: string; status: string; statusKey: string; }

interface AdminUser {
  id: string; name: string; email: string;
  role: UserRole; status: AccountStatus;
  company?: string; phone?: string;
  orders: number; paymentTotal: string;
  joinDate: string; lastLogin: string;
  orderHistory: OrderRef[];
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Beklemede', processing: 'İşlemde', completed: 'Tamamlandı', cancelled: 'İptal',
};
const STATUS_META: Record<AccountStatus, { label: string; active: boolean }> = {
  approved: { label: 'Aktif', active: true },
  pending:  { label: 'Onay Bekliyor', active: false },
  rejected: { label: 'Reddedildi', active: false },
};

function mapAdminUser(u: AdminUserRow): AdminUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    company: u.company ?? undefined,
    phone: u.phone ?? undefined,
    orders: u.orderCount,
    paymentTotal: u.role === 'admin' ? '—' : formatTl(u.totalSpent),
    joinDate: formatTrDate(u.createdAt),
    lastLogin: '—',
    orderHistory: u.orders.map(o => ({
      id: o.orderNo,
      vehicle: o.vehicle,
      stage: stageLabel(o.stage),
      date: formatTrDate(o.date),
      price: formatTl(o.price),
      status: ORDER_STATUS_LABEL[o.status] ?? o.status,
      statusKey: o.status,
    })),
  };
}

const ROLE_LABEL: Record<UserRole, string> = { user: 'Kullanıcı', dealer: 'Bayi', admin: 'Admin' };

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="au">

  @if (currentView() === 'list') {

    <!-- ══ LIST VIEW ══ -->
    <div class="au__header">
      <div>
        <h1 class="au__title">Kullanıcı Yönetimi</h1>
        <p class="au__sub">{{ filteredByTab().length }} kayıt listeleniyor</p>
      </div>
      <div class="au__search-wrap">
        <div class="au-search">
          <i class="pi pi-search"></i>
          <input type="text" placeholder="İsim veya e-posta ara…"
            [ngModel]="search()" (ngModelChange)="search.set($event)" />
        </div>
        <select class="au-filter"
          [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event)">
          <option value="">Tüm Durumlar</option>
          <option value="approved">Aktif</option>
          <option value="pending">Onay Bekliyor</option>
          <option value="rejected">Reddedildi</option>
        </select>
      </div>
    </div>

    <!-- Tabs: Kullanıcılar | Bayiler | Adminler -->
    <div class="au__tabs">
      <button class="au-tab" [class.au-tab--active]="activeTab() === 'user'"   type="button" (click)="setTab('user')">
        <i class="pi pi-user"></i> Kullanıcılar
        <span class="au-tab__count">{{ countByRole('user') }}</span>
      </button>
      <button class="au-tab" [class.au-tab--active]="activeTab() === 'dealer'" type="button" (click)="setTab('dealer')">
        <i class="pi pi-building"></i> Bayiler
        <span class="au-tab__count au-tab__count--amber">{{ countByRole('dealer') }}</span>
      </button>
      <button class="au-tab" [class.au-tab--active]="activeTab() === 'admin'"  type="button" (click)="setTab('admin')">
        <i class="pi pi-shield"></i> Adminler
        <span class="au-tab__count au-tab__count--purple">{{ countByRole('admin') }}</span>
      </button>
    </div>

    <!-- Table -->
    <div class="au-table-wrap">
      <table class="au-table">
        <thead><tr>
          <th>Kullanıcı</th>
          <th>Rol</th>
          @if (activeTab() !== 'admin') { <th>Sipariş</th><th>Toplam Ödeme</th> }
          <th>Durum</th>
          <th>Kayıt</th>
          <th></th>
        </tr></thead>
        <tbody>
          @for (u of filteredByTab(); track u.id) {
            <tr class="au-row" (click)="openDetail(u)">
              <td>
                <div class="au-user-cell">
                  <div class="au-avatar" [class.au-avatar--dealer]="u.role==='dealer'" [class.au-avatar--admin]="u.role==='admin'">
                    {{ initials(u.name) }}
                  </div>
                  <div>
                    <p class="au-user-cell__name">{{ u.name }}</p>
                    <p class="au-user-cell__email">{{ u.email }}</p>
                  </div>
                </div>
              </td>
              <td>
                <span class="au-role-badge au-role-badge--{{ u.role }}">{{ roleLabel(u.role) }}</span>
              </td>
              @if (activeTab() !== 'admin') {
                <td class="au-center">{{ u.orders }}</td>
                <td class="au-payment">{{ u.paymentTotal }}</td>
              }
              <td>
                <span class="au-status" [class.au-status--active]="isActive(u.status)" [class.au-status--passive]="!isActive(u.status)">
                  <span class="au-status__dot"></span>{{ statusLabel(u.status) }}
                </span>
              </td>
              <td class="au-muted">{{ u.joinDate }}</td>
              <td>
                <button class="au-icon-btn" type="button" (click)="$event.stopPropagation(); openDetail(u)">
                  <i class="pi pi-chevron-right"></i>
                </button>
              </td>
            </tr>
          }
          @if (filteredByTab().length === 0) {
            <tr><td [attr.colspan]="activeTab() !== 'admin' ? 7 : 5" class="au-empty-td">
              <i class="pi pi-users"></i><p>Kayıt bulunamadı</p>
            </td></tr>
          }
        </tbody>
      </table>
    </div>

  } @else {

    <!-- ══ DETAIL VIEW ══ -->
    @if (selectedUser(); as u) {
      <div class="au-detail-page">

        <!-- Topbar -->
        <div class="au-detail-page__topbar">
          <button class="au-back-btn" type="button" (click)="goBack()">
            <i class="pi pi-arrow-left"></i> Kullanıcı Yönetimi
          </button>
          <span class="au-breadcrumb">/ {{ u.name }}</span>
        </div>

        <div class="au-detail-page__grid">

          <!-- Left: User info & controls -->
          <div class="au-detail-page__left">

            <!-- Profile card -->
            <div class="au-dp-card">
              <div class="au-dp__profile">
                <div class="au-dp__avatar" [class.au-dp__avatar--dealer]="u.role==='dealer'" [class.au-dp__avatar--admin]="u.role==='admin'">
                  {{ initials(u.name) }}
                </div>
                <div>
                  <h2 class="au-dp__name">{{ u.name }}</h2>
                  <span class="au-role-badge au-role-badge--{{ u.role }}">{{ roleLabel(u.role) }}</span>
                </div>
              </div>
              <div class="au-dp__info-list">
                <div class="au-info-row"><i class="pi pi-envelope"></i><span>{{ u.email }}</span></div>
                @if (u.phone)   { <div class="au-info-row"><i class="pi pi-phone"></i><span>{{ u.phone }}</span></div> }
                @if (u.company) { <div class="au-info-row"><i class="pi pi-building"></i><span>{{ u.company }}</span></div> }
                <div class="au-info-row"><i class="pi pi-calendar"></i><span>Kayıt: {{ u.joinDate }}</span></div>
              </div>
            </div>

            <!-- Stats (non-admin) -->
            @if (u.role !== 'admin') {
              <div class="au-dp-card au-dp__stats-card">
                <div class="au-dp-stat">
                  <span class="au-dp-stat__val">{{ u.orders }}</span>
                  <span class="au-dp-stat__lbl">Toplam Sipariş</span>
                </div>
                <div class="au-dp-stat-divider"></div>
                <div class="au-dp-stat">
                  <span class="au-dp-stat__val au-dp-stat__val--green">{{ u.paymentTotal }}</span>
                  <span class="au-dp-stat__lbl">Toplam Ödeme</span>
                </div>
              </div>
            }

            <!-- Account status -->
            <div class="au-dp-card">
              <h3 class="au-dp-card__title">Hesap Durumu</h3>
              <div class="au-dp__status-row">
                <span class="au-status" [class.au-status--active]="isActive(u.status)" [class.au-status--passive]="!isActive(u.status)">
                  <span class="au-status__dot"></span>{{ statusLabel(u.status) }}
                </span>
                @if (u.status === 'pending') {
                  <span class="au-status-hint">Onay "Kayıtlar" ekranından yapılır</span>
                }
              </div>
            </div>

          </div>

          <!-- Right: Order history -->
          <div class="au-detail-page__right">

            @if (u.role !== 'admin') {
              <div class="au-dp-card au-dp-card--stretch">
                <h3 class="au-dp-card__title">Sipariş Geçmişi</h3>
                @if (u.orderHistory.length > 0) {
                  <div class="au-order-list">
                    @for (o of u.orderHistory; track o.id) {
                      <div class="au-order-item">
                        <div class="au-order-item__left">
                          <span class="au-order-item__id">{{ o.id }}</span>
                          <div>
                            <p class="au-order-item__vehicle">{{ o.vehicle }}</p>
                            <p class="au-order-item__meta">{{ o.stage }} · {{ o.date }}</p>
                          </div>
                        </div>
                        <div class="au-order-item__right">
                          <span class="au-order-item__price">{{ o.price }}</span>
                          <span class="au-obadge au-obadge--{{ o.statusKey }}">{{ o.status }}</span>
                        </div>
                      </div>
                    }
                  </div>
                  <!-- Totals -->
                  <div class="au-order-total">
                    <span>Toplam Ödeme</span>
                    <span class="au-order-total__val">{{ u.paymentTotal }}</span>
                  </div>
                } @else {
                  <div class="au-dp__empty"><i class="pi pi-inbox"></i><p>Henüz sipariş yok</p></div>
                }
              </div>
            } @else {
              <div class="au-dp-card">
                <div class="au-dp__empty"><i class="pi pi-shield"></i><p>Admin hesapları sipariş geçmişine sahip değildir.</p></div>
              </div>
            }

          </div>
        </div>

      </div>
    }

  }
</div>
  `,
  styles: [`
    .au { display: flex; flex-direction: column; gap: 1.25rem; }
    .au__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .au__sub   { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
    .au__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .au__search-wrap { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }

    .au-search {
      display: flex; align-items: center; gap: 0.5rem;
      background: #13151c; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0 0.9rem;
      i { color: rgba(255,255,255,0.3); font-size: 0.8rem; flex-shrink: 0; }
      input { background: transparent; border: none; color: rgba(255,255,255,0.85); font-size: 0.85rem; padding: 0.6rem 0; width: 200px;
        &:focus { outline: none; } &::placeholder { color: rgba(255,255,255,0.2); }
      }
    }
    .au-filter {
      background: #13151c; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
      padding: 0.6rem 1rem; color: rgba(255,255,255,0.75); font-size: 0.8rem; cursor: pointer; appearance: none; min-width: 130px;
      option { background: #1a1d27; }
    }

    /* Tabs */
    .au__tabs { display: flex; gap: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.07); }
    .au-tab {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.65rem 1.1rem; border-radius: 10px 10px 0 0; border: none; cursor: pointer;
      background: transparent; color: rgba(255,255,255,0.4); font-size: 0.82rem; font-weight: 500;
      transition: background 180ms, color 180ms;
      &:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.8); }
      &--active { background: rgba(245,158,11,0.1); color: #f59e0b; border-bottom: 2px solid #f59e0b; }
      i { font-size: 0.85rem; }
    }
    .au-tab__count {
      min-width: 20px; height: 20px; border-radius: 10px; padding: 0 5px;
      background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); font-size: 0.68rem; font-weight: 700;
      display: inline-flex; align-items: center; justify-content: center;
      &--amber  { background: rgba(245,158,11,0.15); color: #f59e0b; }
      &--purple { background: rgba(167,139,250,0.15); color: #a78bfa; }
    }

    /* Table */
    .au-table-wrap { background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: auto; }
    .au-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; min-width: 600px;
      th { color: rgba(255,255,255,0.3); font-weight: 600; text-transform: uppercase; font-size: 0.65rem; letter-spacing: .05em; padding: 1rem 1.25rem 0.75rem; text-align: left; }
      td { padding: 0.85rem 1.25rem; border-top: 1px solid rgba(255,255,255,0.05); vertical-align: middle; }
    }
    .au-row { cursor: pointer; transition: background 140ms; &:hover td { background: rgba(255,255,255,0.025); } }
    .au-center { text-align: center; font-weight: 700; color: #fff; }
    .au-payment { font-weight: 700; color: #4ade80; font-size: 0.82rem; }
    .au-muted { color: rgba(255,255,255,0.35) !important; font-size: 0.78rem; }
    .au-empty-td { text-align: center; padding: 3rem !important; color: rgba(255,255,255,0.3); i { font-size: 2rem; display: block; margin-bottom: 0.5rem; } p { margin: 0; font-size: 0.875rem; } }

    .au-user-cell { display: flex; align-items: center; gap: 0.75rem;
      &__name  { font-size: 0.85rem; font-weight: 600; color: #fff; margin: 0 0 2px; }
      &__email { font-size: 0.72rem; color: rgba(255,255,255,0.35); margin: 0; }
    }
    .au-avatar {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      background: rgba(96,165,250,0.15); color: #60a5fa;
      display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700;
      &--dealer { background: rgba(245,158,11,0.15); color: #f59e0b; }
      &--admin  { background: rgba(167,139,250,0.15); color: #a78bfa; }
    }
    .au-role-badge {
      display: inline-flex; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
      &--user   { background: rgba(96,165,250,0.1);  color: #60a5fa; border: 1px solid rgba(96,165,250,0.2);  }
      &--dealer { background: rgba(245,158,11,0.1);  color: #f59e0b; border: 1px solid rgba(245,158,11,0.2);  }
      &--admin  { background: rgba(167,139,250,0.1); color: #a78bfa; border: 1px solid rgba(167,139,250,0.2); }
    }
    .au-status { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem;
      &__dot { width: 7px; height: 7px; border-radius: 50%; }
      &--active  .au-status__dot { background: #4ade80; box-shadow: 0 0 6px #4ade8088; }
      &--passive .au-status__dot { background: rgba(255,255,255,0.2); }
      &--active  { color: #4ade80; } &--passive { color: rgba(255,255,255,0.35); }
    }
    .au-icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.4); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; &:hover { background: rgba(255,255,255,0.08); color: #fff; } }

    /* ══ DETAIL PAGE ══ */
    .au-detail-page { display: flex; flex-direction: column; gap: 1.5rem; animation: fadeIn 220ms ease both; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    .au-detail-page__topbar { display: flex; align-items: center; gap: 0.5rem; }
    .au-back-btn {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.6); font-size: 0.82rem; cursor: pointer;
      transition: all 160ms; &:hover { background: rgba(255,255,255,0.07); color: #fff; }
      i { font-size: 0.75rem; }
    }
    .au-breadcrumb { font-size: 0.82rem; color: rgba(255,255,255,0.3); }

    .au-detail-page__grid { display: grid; grid-template-columns: 340px 1fr; gap: 1.25rem; align-items: start; @media(max-width:1000px) { grid-template-columns: 1fr; } }
    .au-detail-page__left  { display: flex; flex-direction: column; gap: 1.25rem; }
    .au-detail-page__right { display: flex; flex-direction: column; gap: 1.25rem; }

    .au-dp-card {
      background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 1.25rem;
      &--stretch { flex: 1; }
      &__title { font-size: 0.68rem; font-weight: 700; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: .07em; margin: 0 0 1rem; }
    }
    .au-dp__profile { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
    .au-dp__avatar {
      width: 56px; height: 56px; border-radius: 14px; flex-shrink: 0;
      background: rgba(96,165,250,0.15); color: #60a5fa;
      display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 700;
      &--dealer { background: rgba(245,158,11,0.15); color: #f59e0b; }
      &--admin  { background: rgba(167,139,250,0.15); color: #a78bfa; }
    }
    .au-dp__name { font-size: 1.05rem; font-weight: 700; color: #fff; margin: 0 0 5px; }

    .au-dp__info-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .au-info-row { display: flex; align-items: center; gap: 0.6rem; font-size: 0.8rem; color: rgba(255,255,255,0.6); i { color: rgba(255,255,255,0.25); font-size: 0.8rem; flex-shrink: 0; } }

    .au-dp__stats-card { display: flex; align-items: center; gap: 0; padding: 1rem 1.25rem; }
    .au-dp-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
      &__val { font-size: 1.4rem; font-weight: 800; color: #fff; &--green { color: #4ade80; } }
      &__lbl { font-size: 0.7rem; color: rgba(255,255,255,0.35); }
    }
    .au-dp-stat-divider { width: 1px; height: 40px; background: rgba(255,255,255,0.08); flex-shrink: 0; }

    .au-dp__mgmt { display: flex; flex-direction: column; gap: 0.75rem; }
    .au-dp__status-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
    .au-status-hint { font-size: 0.72rem; color: rgba(255,255,255,0.35); }
    .au-toggle-btn {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.85rem; border-radius: 8px; border: none; cursor: pointer; font-size: 0.75rem; font-weight: 600;
      &--deactivate { background: rgba(248,113,113,0.1); color: #f87171; border: 1px solid rgba(248,113,113,0.2); &:hover { background: rgba(248,113,113,0.2); } }
      &--activate   { background: rgba(74,222,128,0.1);  color: #4ade80; border: 1px solid rgba(74,222,128,0.2);  &:hover { background: rgba(74,222,128,0.2); } }
    }
    .au-dp__action-row { display: flex; gap: 0.5rem; }
    .au-action-btn {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.5rem; border-radius: 8px; font-size: 0.78rem; font-weight: 500; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.5); transition: all 160ms;
      &--edit  { &:hover { border-color: rgba(96,165,250,0.4); color: #60a5fa; background: rgba(96,165,250,0.07); } }
      &--reset { &:hover { border-color: rgba(251,191,36,0.4); color: #fbbf24; background: rgba(251,191,36,0.07); } }
    }

    /* Order history */
    .au-order-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .au-order-item {
      display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
      background: rgba(255,255,255,0.03); border-radius: 10px; padding: 0.75rem 0.9rem;
      &__left  { display: flex; align-items: center; gap: 0.65rem; }
      &__id    { font-family: monospace; font-size: 0.72rem; font-weight: 700; color: #f59e0b; flex-shrink: 0; }
      &__vehicle { font-size: 0.82rem; font-weight: 600; color: #fff; margin: 0 0 2px; }
      &__meta  { font-size: 0.68rem; color: rgba(255,255,255,0.3); margin: 0; }
      &__right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
      &__price { font-size: 0.82rem; font-weight: 700; color: #fff; }
    }
    .au-obadge {
      display: inline-flex; padding: 0.15rem 0.45rem; border-radius: 5px; font-size: 0.6rem; font-weight: 700; text-transform: uppercase;
      &--completed  { background: rgba(74,222,128,0.1);  color: #4ade80;  border: 1px solid rgba(74,222,128,0.2);  }
      &--processing { background: rgba(96,165,250,0.1);  color: #60a5fa;  border: 1px solid rgba(96,165,250,0.2);  }
      &--pending    { background: rgba(251,191,36,0.1);  color: #fbbf24;  border: 1px solid rgba(251,191,36,0.2);  }
      &--cancelled  { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.35); border: 1px solid rgba(255,255,255,0.1); }
    }
    .au-order-total {
      display: flex; align-items: center; justify-content: space-between; margin-top: 0.75rem;
      padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.07);
      font-size: 0.8rem; color: rgba(255,255,255,0.4);
      &__val { font-size: 1rem; font-weight: 800; color: #4ade80; }
    }
    .au-dp__empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1.5rem; color: rgba(255,255,255,0.2); i { font-size: 1.75rem; } p { font-size: 0.8rem; margin: 0; text-align: center; } }
  `],
})
export class AdminUsersPage implements OnInit {
  private readonly adminApi = inject(AdminService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly allUsers     = signal<AdminUser[]>([]);
  protected readonly activeTab    = signal<UserRole>('user');
  protected readonly search       = signal('');
  protected readonly filterStatus = signal('');
  protected readonly currentView  = signal<'list' | 'detail'>('list');
  protected readonly selectedUser = signal<AdminUser | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.adminApi.listUsers();
      this.allUsers.set(data.map(mapAdminUser));
    } catch { /* sessiz */ }
    finally { this.cdr.markForCheck(); }
  }

  setTab(tab: UserRole): void { this.activeTab.set(tab); this.goBack(); }
  countByRole(r: UserRole): number { return this.allUsers().filter(u => u.role === r).length; }
  roleLabel(r: UserRole): string   { return ROLE_LABEL[r]; }
  statusLabel(s: AccountStatus): string { return STATUS_META[s].label; }
  isActive(s: AccountStatus): boolean { return STATUS_META[s].active; }
  initials(name: string): string   { return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

  protected readonly filteredByTab = computed(() => {
    const tab = this.activeTab();
    const q   = this.search().toLowerCase();
    const st  = this.filterStatus();
    let list  = this.allUsers().filter(u => u.role === tab);
    if (q)  { list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)); }
    if (st) { list = list.filter(u => u.status === st); }
    return list;
  });

  openDetail(u: AdminUser): void { this.selectedUser.set(u); this.currentView.set('detail'); }
  goBack(): void { this.currentView.set('list'); this.selectedUser.set(null); }
}
