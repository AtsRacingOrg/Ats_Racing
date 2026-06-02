import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component, computed, effect, inject, OnInit, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, Registration, RegStatus } from '../../../../core/admin/admin.service';
import { Paginator } from '../../../../shared/paginator';
import { PageLoader } from '../../../../shared/page-loader';

@Component({
  selector: 'app-admin-registrations',
  standalone: true,
  imports: [FormsModule, Paginator, PageLoader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="ar">

  <!-- Header -->
  <div class="ar__header">
    <div>
      <h1 class="ar__title">Üyelik Başvuruları</h1>
      <p class="ar__sub">{{ filtered().length }} kayıt listeleniyor</p>
    </div>
    <div class="ar__filters">
      <button class="ar-filter-btn" [class.ar-filter-btn--active]="statusFilter() === 'pending'"
        (click)="setFilter('pending')">
        <span class="ar-dot ar-dot--pending"></span> Bekleyenler
        <span class="ar-count">{{ countByStatus('pending') }}</span>
      </button>
      <button class="ar-filter-btn" [class.ar-filter-btn--active]="statusFilter() === 'approved'"
        (click)="setFilter('approved')">
        <span class="ar-dot ar-dot--approved"></span> Onaylananlar
        <span class="ar-count">{{ countByStatus('approved') }}</span>
      </button>
      <button class="ar-filter-btn" [class.ar-filter-btn--active]="statusFilter() === 'rejected'"
        (click)="setFilter('rejected')">
        <span class="ar-dot ar-dot--rejected"></span> Reddedilenler
        <span class="ar-count">{{ countByStatus('rejected') }}</span>
      </button>
    </div>
  </div>

  <!-- Loading -->
  @if (loading()) {
    <app-page-loader />
  }

  <!-- Error -->
  @if (error(); as err) {
    <div class="ar-error">
      <i class="pi pi-exclamation-triangle"></i>
      <span>{{ err }}</span>
      <button class="ar-retry-btn" (click)="load()">Yeniden Dene</button>
    </div>
  }

  <!-- List -->
  @if (!loading() && !error()) {
    @if (filtered().length === 0) {
      <div class="ar-empty">
        <i class="pi pi-inbox"></i>
        <p>Bu kategoride başvuru yok.</p>
      </div>
    } @else {
      <div class="ar-list">
        @for (reg of paged(); track reg.id) {
          <div class="ar-card" [class.ar-card--approved]="reg.status === 'approved'" [class.ar-card--rejected]="reg.status === 'rejected'">

            <!-- User info -->
            <div class="ar-card__left">
              <div class="ar-avatar" [class.ar-avatar--dealer]="reg.role === 'dealer'" [class.ar-avatar--admin]="reg.role === 'admin'">
                {{ initials(reg.fullName) }}
              </div>
              <div class="ar-card__info">
                <div class="ar-card__name-row">
                  <span class="ar-card__name">{{ reg.fullName }}</span>
                  <span class="ar-role-badge ar-role-badge--{{ reg.role }}">
                    <i [class]="reg.role === 'dealer' ? 'pi pi-building' : reg.role === 'admin' ? 'pi pi-shield' : 'pi pi-user'"></i>
                    {{ reg.role === 'dealer' ? 'Bayi' : reg.role === 'admin' ? 'Admin' : 'Bireysel' }}
                  </span>
                </div>
                <span class="ar-card__email">{{ reg.email }}</span>
                @if (reg.phone) {
                  <span class="ar-card__meta"><i class="pi pi-phone"></i> {{ reg.phone }}</span>
                }
                @if (reg.dealershipName) {
                  <span class="ar-card__meta"><i class="pi pi-building"></i> {{ reg.dealershipName }}</span>
                }
                <span class="ar-card__date"><i class="pi pi-calendar"></i> {{ formatDate(reg.createdAt) }}</span>
              </div>
            </div>

            <!-- Status / Actions -->
            <div class="ar-card__right">
              @if (reg.status === 'approved') {
                <span class="ar-status-badge ar-status-badge--approved">
                  <i class="pi pi-check-circle"></i> Onaylandı
                </span>
              } @else if (reg.status === 'rejected') {
                <div class="ar-rejected-info">
                  <span class="ar-status-badge ar-status-badge--rejected">
                    <i class="pi pi-times-circle"></i> Reddedildi
                  </span>
                  @if (reg.rejectionReason) {
                    <span class="ar-reject-reason">{{ reg.rejectionReason }}</span>
                  }
                </div>
              } @else {
                <!-- Reject reason inline input -->
                @if (rejectingId() === reg.id) {
                  <div class="ar-reject-form">
                    <input
                      class="ar-reject-input"
                      type="text"
                      placeholder="Red sebebi (zorunlu)…"
                      [(ngModel)]="rejectReason"
                      (keydown.escape)="cancelReject()"
                    />
                    <div class="ar-reject-form__btns">
                      <button class="ar-btn ar-btn--confirm-reject"
                        [disabled]="rejectReason.trim().length < 3 || actionLoading()"
                        (click)="confirmReject(reg.id)">
                        <i class="pi pi-check"></i> Reddet
                      </button>
                      <button class="ar-btn ar-btn--cancel" (click)="cancelReject()">
                        <i class="pi pi-times"></i>
                      </button>
                    </div>
                  </div>
                } @else {
                  <div class="ar-actions">
                    <button class="ar-btn ar-btn--approve"
                      [disabled]="actionLoading()"
                      (click)="approve(reg.id)">
                      <i class="pi pi-check"></i> Onayla
                    </button>
                    <button class="ar-btn ar-btn--reject"
                      [disabled]="actionLoading()"
                      (click)="startReject(reg.id)">
                      <i class="pi pi-times"></i> Reddet
                    </button>
                  </div>
                }
              }
            </div>

          </div>
        }
      </div>
      <app-paginator [total]="filtered().length" [(page)]="page" [pageSize]="pageSize" />
    }
  }

</div>
  `,
  styles: [`
    .ar { display: flex; flex-direction: column; gap: 1.5rem; }
    .ar__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .ar__sub   { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
    .ar__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .ar__filters { display: flex; gap: 0.5rem; flex-wrap: wrap; }

    .ar-filter-btn {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 1rem; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.08); background: #13151c;
      color: rgba(255,255,255,0.45); font-size: 0.8rem; font-weight: 500; cursor: pointer;
      transition: all 160ms;
      &:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.8); }
      &--active { border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.08); color: #f59e0b; }
    }
    .ar-dot {
      width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
      &--pending  { background: #fbbf24; box-shadow: 0 0 6px #fbbf2488; }
      &--approved { background: #4ade80; box-shadow: 0 0 6px #4ade8088; }
      &--rejected { background: #f87171; box-shadow: 0 0 6px #f8717188; }
    }
    .ar-count {
      min-width: 20px; height: 18px; border-radius: 9px; padding: 0 5px;
      background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.4);
      font-size: 0.65rem; font-weight: 700;
      display: inline-flex; align-items: center; justify-content: center;
    }

    /* Skeleton */
    .ar-skeleton-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .ar-skeleton {
      height: 96px; border-radius: 16px;
      background: linear-gradient(90deg, #13151c 25%, #1a1d27 50%, #13151c 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* Error */
    .ar-error {
      display: flex; align-items: center; gap: 0.75rem;
      background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2);
      border-radius: 12px; padding: 1rem 1.25rem;
      color: #f87171; font-size: 0.875rem;
      i { flex-shrink: 0; }
    }
    .ar-retry-btn {
      margin-left: auto; padding: 0.35rem 0.85rem; border-radius: 8px;
      border: 1px solid rgba(248,113,113,0.3); background: transparent;
      color: #f87171; font-size: 0.75rem; cursor: pointer;
      &:hover { background: rgba(248,113,113,0.1); }
    }

    /* Empty */
    .ar-empty {
      display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
      padding: 4rem; color: rgba(255,255,255,0.2);
      i { font-size: 2.5rem; }
      p { font-size: 0.9rem; margin: 0; }
    }

    /* List */
    .ar-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .ar-card {
      display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
      background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px;
      padding: 1.25rem 1.5rem; flex-wrap: wrap;
      transition: border-color 200ms;
      &--approved { border-color: rgba(74,222,128,0.15); }
      &--rejected { border-color: rgba(248,113,113,0.12); }
    }

    .ar-card__left { display: flex; align-items: flex-start; gap: 1rem; flex: 1; min-width: 0; }
    .ar-avatar {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      background: rgba(96,165,250,0.15); color: #60a5fa;
      display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700;
      &--dealer { background: rgba(245,158,11,0.15); color: #f59e0b; }
      &--admin  { background: rgba(167,139,250,0.15); color: #a78bfa; }
    }
    .ar-card__info { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
    .ar-card__name-row { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
    .ar-card__name  { font-size: 0.95rem; font-weight: 700; color: #fff; }
    .ar-card__email { font-size: 0.78rem; color: rgba(255,255,255,0.4); }
    .ar-card__meta  {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: 0.75rem; color: rgba(255,255,255,0.35);
      i { font-size: 0.7rem; }
    }
    .ar-card__date  {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: 0.72rem; color: rgba(255,255,255,0.25);
      i { font-size: 0.65rem; }
    }

    .ar-role-badge {
      display: inline-flex; align-items: center; gap: 0.3rem;
      padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.65rem; font-weight: 700;
      &--user   { background: rgba(96,165,250,0.1);  color: #60a5fa; border: 1px solid rgba(96,165,250,0.2);  }
      &--dealer { background: rgba(245,158,11,0.1);  color: #f59e0b; border: 1px solid rgba(245,158,11,0.2);  }
      &--admin  { background: rgba(167,139,250,0.1); color: #a78bfa; border: 1px solid rgba(167,139,250,0.2); }
      i { font-size: 0.65rem; }
    }

    /* Actions */
    .ar-card__right { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }

    .ar-actions { display: flex; gap: 0.5rem; }
    .ar-btn {
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.5rem 1rem; border-radius: 9px; font-size: 0.78rem; font-weight: 600;
      cursor: pointer; border: 1px solid transparent; transition: all 160ms;
      &:disabled { opacity: 0.45; cursor: not-allowed; }

      &--approve {
        background: rgba(74,222,128,0.1); color: #4ade80; border-color: rgba(74,222,128,0.25);
        &:hover:not(:disabled) { background: rgba(74,222,128,0.2); }
      }
      &--reject {
        background: rgba(248,113,113,0.08); color: #f87171; border-color: rgba(248,113,113,0.2);
        &:hover:not(:disabled) { background: rgba(248,113,113,0.18); }
      }
      &--confirm-reject {
        background: rgba(248,113,113,0.1); color: #f87171; border-color: rgba(248,113,113,0.25);
        &:hover:not(:disabled) { background: rgba(248,113,113,0.2); }
      }
      &--cancel {
        background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.4); border-color: rgba(255,255,255,0.08);
        &:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
      }
      i { font-size: 0.75rem; }
    }

    .ar-reject-form { display: flex; flex-direction: column; gap: 0.5rem; min-width: 220px; }
    .ar-reject-input {
      background: #0d0f18; border: 1px solid rgba(248,113,113,0.3);
      border-radius: 8px; padding: 0.5rem 0.85rem;
      color: rgba(255,255,255,0.85); font-size: 0.8rem; width: 100%;
      &:focus { outline: none; border-color: #f87171; box-shadow: 0 0 0 2px rgba(248,113,113,0.15); }
      &::placeholder { color: rgba(255,255,255,0.2); }
    }
    .ar-reject-form__btns { display: flex; gap: 0.4rem; }

    .ar-status-badge {
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.35rem 0.8rem; border-radius: 8px; font-size: 0.75rem; font-weight: 600;
      &--approved { background: rgba(74,222,128,0.1);  color: #4ade80;  border: 1px solid rgba(74,222,128,0.2);  }
      &--rejected { background: rgba(248,113,113,0.08); color: #f87171; border: 1px solid rgba(248,113,113,0.2); }
      i { font-size: 0.75rem; }
    }
    .ar-rejected-info { display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem; }
    .ar-reject-reason { font-size: 0.72rem; color: rgba(255,255,255,0.3); max-width: 200px; text-align: right; }
  `],
})
export class AdminRegistrationsPage implements OnInit {
  private readonly adminSvc = inject(AdminService);
  private readonly cdr      = inject(ChangeDetectorRef);

  protected readonly registrations = signal<Registration[]>([]);
  protected readonly statusFilter  = signal<RegStatus>('pending');
  protected readonly loading       = signal(true);
  protected readonly error         = signal<string | null>(null);
  protected readonly actionLoading = signal(false);
  protected readonly rejectingId   = signal<string | null>(null);
  protected rejectReason = '';

  ngOnInit(): void { this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const all = await this.adminSvc.listRegistrations();
      this.registrations.set(all);
    } catch {
      this.error.set('Başvurular yüklenemedi. Yetkinizi ve bağlantınızı kontrol edin.');
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  setFilter(s: RegStatus): void { this.statusFilter.set(s); }

  protected readonly filtered = computed<Registration[]>(() =>
    this.registrations().filter(r => r.status === this.statusFilter()),
  );

  protected readonly pageSize = 10;
  protected readonly page = signal(1);
  protected readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });
  private readonly _resetPage = effect(() => {
    this.statusFilter();
    this.page.set(1);
  });

  countByStatus(s: RegStatus): number {
    return this.registrations().filter(r => r.status === s).length;
  }

  initials(name: string): string {
    if (!name?.trim()) return '?';
    return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  startReject(id: string): void { this.rejectingId.set(id); this.rejectReason = ''; }
  cancelReject(): void { this.rejectingId.set(null); this.rejectReason = ''; }

  async approve(id: string): Promise<void> {
    this.actionLoading.set(true);
    try {
      const updated = await this.adminSvc.approve(id);
      this.registrations.update(list => list.map(r => r.id === id ? updated : r));
    } catch {
      // TODO: show toast
    } finally {
      this.actionLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async confirmReject(id: string): Promise<void> {
    if (this.rejectReason.trim().length < 3) return;
    this.actionLoading.set(true);
    try {
      const updated = await this.adminSvc.reject(id, this.rejectReason.trim());
      this.registrations.update(list => list.map(r => r.id === id ? updated : r));
      this.cancelReject();
    } catch {
      // TODO: show toast
    } finally {
      this.actionLoading.set(false);
      this.cdr.markForCheck();
    }
  }
}
