import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, effect, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PageLoader } from '../../../../shared/page-loader';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUserRow, UserBilling } from '../../../../core/admin/admin.service';
import { Statement } from '../../../../core/payments/payments.service';
import { stageLabel, formatTl, formatTrDate, formatTrDateTime } from '../../../../core/orders/order-format';
import { StatementsPanel } from '../../../../shared/statements-panel';
import { Paginator } from '../../../../shared/paginator';

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
  pending: 'Hazırlanıyor', processing: 'Hazırlanıyor', completed: 'Tamamlandı', cancelled: 'İptal',
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
      date: formatTrDateTime(o.date),
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
  imports: [FormsModule, PageLoader, StatementsPanel, Paginator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
@if (loading()) { <app-page-loader /> } @else {
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
          @if (activeTab() !== 'admin') { <th>Sipariş</th><th>Toplam Ödenen</th> }
          <th>Durum</th>
          <th>Kayıt</th>
          <th></th>
        </tr></thead>
        <tbody>
          @for (u of pagedUsers(); track u.id) {
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
      <app-paginator [total]="filteredByTab().length" [(page)]="page" [pageSize]="pageSize" />
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
                  <span class="au-dp-stat__val au-dp-stat__val--green">{{ u.role === 'dealer' ? dealerPaidTotal() : u.paymentTotal }}</span>
                  <span class="au-dp-stat__lbl">Toplam Ödenen</span>
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
              @if (u.status !== 'pending') {
                @if (isActive(u.status)) {
                  <button class="au-toggle-btn au-toggle-btn--deactivate" type="button"
                          [disabled]="togglingActive()"
                          (click)="toggleActive(u, false)">
                    <i class="pi" [class.pi-ban]="!togglingActive()" [class.pi-spin]="togglingActive()" [class.pi-spinner]="togglingActive()"></i>
                    {{ togglingActive() ? 'İşleniyor…' : 'Hesabı Pasif Yap' }}
                  </button>
                  <p class="au-toggle-hint">Pasif hesap giriş yapamaz.</p>
                } @else {
                  <button class="au-toggle-btn au-toggle-btn--activate" type="button"
                          [disabled]="togglingActive()"
                          (click)="toggleActive(u, true)">
                    <i class="pi" [class.pi-check-circle]="!togglingActive()" [class.pi-spin]="togglingActive()" [class.pi-spinner]="togglingActive()"></i>
                    {{ togglingActive() ? 'İşleniyor…' : 'Hesabı Aktif Yap' }}
                  </button>
                  <p class="au-toggle-hint">Aktif edilince kullanıcı tekrar giriş yapabilir.</p>
                }
              }
            </div>

            <!-- Fatura bilgileri -->
            @if (u.role !== 'admin') {
              <div class="au-dp-card">
                <h3 class="au-dp-card__title">Fatura Bilgileri</h3>
                @if (billing(); as b) {
                  <div class="au-bill">
                    <div class="au-bill__row"><span>Tür</span><b>{{ b.type === 'corporate' ? 'Kurumsal' : 'Bireysel' }}</b></div>
                    @if (b.type === 'corporate') {
                      <div class="au-bill__row"><span>Ünvan</span><b>{{ b.companyName || '—' }}</b></div>
                      <div class="au-bill__row"><span>Vergi Dairesi</span><b>{{ b.taxOffice || '—' }}</b></div>
                      <div class="au-bill__row"><span>Vergi No</span><b>{{ b.taxNumber || '—' }}</b></div>
                    } @else {
                      <div class="au-bill__row"><span>Ad Soyad</span><b>{{ b.fullName || '—' }}</b></div>
                      <div class="au-bill__row"><span>T.C. No</span><b>{{ b.tcNo || '—' }}</b></div>
                    }
                    @if (b.phone) { <div class="au-bill__row"><span>Telefon</span><b>{{ b.phone }}</b></div> }
                    <div class="au-bill__row"><span>İl / İlçe</span><b>{{ b.city || '—' }}{{ b.district ? ' / ' + b.district : '' }}</b></div>
                    <div class="au-bill__row au-bill__row--addr"><span>Adres</span><b>{{ b.address || '—' }}</b></div>
                  </div>
                } @else if (billingLoaded()) {
                  <div class="au-dp__empty"><i class="pi pi-file"></i><p>Fatura bilgisi girilmemiş</p></div>
                } @else {
                  <p class="au-status-hint">Yükleniyor…</p>
                }
              </div>
            }

          </div>

          <!-- Right: Order history -->
          <div class="au-detail-page__right">

            @if (u.role !== 'admin') {
              @if (u.role === 'dealer') {
                <!-- Tab bar -->
                <div class="au-tabs" role="tablist">
                  <button class="au-tab" type="button" role="tab"
                          [class.au-tab--active]="detailTab() === 'orders'"
                          [attr.aria-selected]="detailTab() === 'orders'"
                          (click)="detailTab.set('orders')">
                    <i class="pi pi-shopping-cart"></i> Sipariş Geçmişi
                  </button>
                  <button class="au-tab" type="button" role="tab"
                          [class.au-tab--active]="detailTab() === 'payments'"
                          [attr.aria-selected]="detailTab() === 'payments'"
                          (click)="detailTab.set('payments')">
                    <i class="pi pi-wallet"></i> Ödemeler
                  </button>
                </div>
              }

              @if (u.role !== 'dealer' || detailTab() === 'orders') {
                <div class="au-dp-card au-dp-card--stretch">
                  <h3 class="au-dp-card__title">Sipariş Geçmişi</h3>
                  @if (u.orderHistory.length > 0) {
                    <div class="au-order-list">
                      @for (o of pagedOrderHistory(); track o.id) {
                        <button type="button" class="au-order-item au-order-item--link" (click)="goToOrder(o.id)" title="Sipariş detayına git">
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
                            <i class="pi pi-chevron-right au-order-item__chev"></i>
                          </div>
                        </button>
                      }
                    </div>
                    <app-paginator [total]="u.orderHistory.length" [(page)]="orderPage" [pageSize]="orderPageSize" />
                    <!-- Totals -->
                    <div class="au-order-total">
                      <span>Toplam Ödenen</span>
                      <span class="au-order-total__val">{{ u.role === 'dealer' ? dealerPaidTotal() : u.paymentTotal }}</span>
                    </div>
                  } @else {
                    <div class="au-dp__empty"><i class="pi pi-inbox"></i><p>Henüz sipariş yok</p></div>
                  }
                </div>
              }

              @if (u.role === 'dealer' && detailTab() === 'payments') {
                <app-statements-panel [statements]="statements()" [readonly]="true" />
              }
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
}
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
      margin-top: 0.85rem; width: 100%;
      display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.65rem 0.9rem; border-radius: 10px; cursor: pointer;
      font-size: 0.82rem; font-weight: 600; border: 1px solid transparent;
      transition: all 160ms;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
      i { font-size: 0.85rem; }
      &--deactivate { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.3); color: #f87171; &:hover:not(:disabled){ background: rgba(248,113,113,0.18); } }
      &--activate   { background: rgba(74,222,128,0.1);  border-color: rgba(74,222,128,0.3);  color: #4ade80; &:hover:not(:disabled){ background: rgba(74,222,128,0.18); } }
    }
    .au-toggle-hint { margin: 0.45rem 0 0; font-size: 0.7rem; color: rgba(255,255,255,0.35); }
    .au-tabs {
      display: inline-flex; gap: 0.25rem; padding: 0.25rem;
      background: #13151c; border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px; margin-bottom: 0.85rem;
    }
    .au-tab {
      display: inline-flex; align-items: center; gap: 0.45rem;
      padding: 0.5rem 0.95rem; border-radius: 9px; cursor: pointer;
      background: transparent; border: none; color: rgba(255,255,255,0.5);
      font-size: 0.82rem; font-weight: 600; transition: all 160ms;
      i { font-size: 0.85rem; }
      &:hover { color: rgba(255,255,255,0.85); }
      &--active { background: rgba(245,158,11,0.14); color: #f59e0b; }
    }
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
      display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; width: 100%; text-align: left;
      background: rgba(255,255,255,0.03); border: 1px solid transparent; border-radius: 10px; padding: 0.75rem 0.9rem;
      &--link { cursor: pointer; transition: background 140ms, border-color 140ms; &:hover { background: rgba(255,255,255,0.06); border-color: rgba(245,158,11,0.3); } }
      &__left  { display: flex; align-items: center; gap: 0.65rem; }
      &__id    { font-family: monospace; font-size: 0.72rem; font-weight: 700; color: #f59e0b; flex-shrink: 0; }
      &__vehicle { font-size: 0.82rem; font-weight: 600; color: #fff; margin: 0 0 2px; }
      &__meta  { font-size: 0.68rem; color: rgba(255,255,255,0.3); margin: 0; }
      &__right { display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0; }
      &__price { font-size: 0.82rem; font-weight: 700; color: #fff; }
      &__chev  { color: rgba(255,255,255,0.3); font-size: 0.75rem; }
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
    .au-bill { display: flex; flex-direction: column; gap: 0.5rem; }
    .au-bill__row { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.8rem;
      span { color: rgba(255,255,255,0.4); white-space: nowrap; }
      b { color: rgba(255,255,255,0.85); font-weight: 600; text-align: right; }
      &--addr b { text-align: right; white-space: pre-wrap; }
    }
  `],
})
export class AdminUsersPage implements OnInit {
  private readonly adminApi = inject(AdminService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  /* Sipariş geçmişi sayfalama (seçili kullanıcı) */
  protected readonly orderPageSize = 5;
  protected readonly orderPage = signal(1);
  protected readonly pagedOrderHistory = computed(() => {
    const hist = this.selectedUser()?.orderHistory ?? [];
    const start = (this.orderPage() - 1) * this.orderPageSize;
    return hist.slice(start, start + this.orderPageSize);
  });
  goToOrder(orderNo: string): void {
    this.router.navigate(['/admin/orders'], { queryParams: { order: orderNo } });
  }

  protected readonly allUsers     = signal<AdminUser[]>([]);
  protected readonly activeTab    = signal<UserRole>('user');
  protected readonly search       = signal('');
  protected readonly filterStatus = signal('');
  protected readonly currentView  = signal<'list' | 'detail'>('list');
  protected readonly selectedUser = signal<AdminUser | null>(null);
  protected readonly loading      = signal(true);
  protected readonly statements   = signal<Statement[]>([]);
  protected readonly billing      = signal<UserBilling | null>(null);
  protected readonly billingLoaded = signal(false);
  protected readonly dealerPaidTotal = computed(() =>
    formatTl(this.statements().filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.total ?? 0), 0)),
  );

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.adminApi.listUsers();
      this.allUsers.set(data.map(mapAdminUser));
    } catch { /* sessiz */ }
    finally { this.loading.set(false); this.cdr.markForCheck(); }
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

  /* ─── Sayfalama (10/sayfa) ─── */
  protected readonly pageSize = 10;
  protected readonly page     = signal(1);
  protected readonly pagedUsers = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredByTab().slice(start, start + this.pageSize);
  });
  private readonly _resetPage = effect(() => {
    this.activeTab(); this.search(); this.filterStatus();
    this.page.set(1);
  });

  protected readonly detailTab = signal<'orders' | 'payments'>('orders');

  async openDetail(u: AdminUser): Promise<void> {
    this.selectedUser.set(u);
    this.currentView.set('detail');
    this.detailTab.set('orders');
    this.orderPage.set(1);
    this.statements.set([]);
    this.billing.set(null);
    this.billingLoaded.set(false);
    if (u.role !== 'admin') {
      this.adminApi.getUserBilling(u.id)
        .then(b => { this.billing.set(b); })
        .catch(() => {})
        .finally(() => { this.billingLoaded.set(true); this.cdr.markForCheck(); });
    }
    if (u.role === 'dealer') {
      try { this.statements.set(await this.adminApi.listDealerStatements(u.id)); }
      catch { /* sessiz */ }
      this.cdr.markForCheck();
    }
  }

  protected readonly togglingActive = signal(false);
  async toggleActive(u: AdminUser, active: boolean): Promise<void> {
    if (this.togglingActive()) { return; }
    const verb = active ? 'aktif' : 'pasif';
    if (!confirm(`${u.name} hesabını ${verb} yapmak istediğinize emin misiniz?`)) { return; }
    this.togglingActive.set(true);
    try {
      await this.adminApi.setUserActive(u.id, active);
      const newStatus: AccountStatus = active ? 'approved' : 'rejected';
      this.allUsers.update(list => list.map(x => x.id === u.id ? { ...x, status: newStatus } : x));
      this.selectedUser.update(sel => sel?.id === u.id ? { ...sel, status: newStatus } : sel);
    } catch {
      alert('Hesap durumu güncellenemedi.');
    } finally {
      this.togglingActive.set(false);
      this.cdr.markForCheck();
    }
  }
  goBack(): void { this.currentView.set('list'); this.selectedUser.set(null); }
}
