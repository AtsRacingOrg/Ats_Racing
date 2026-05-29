import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="ao">
  <div class="ao__header">
    <h1 class="ao__title">Genel Bakış</h1>
    <p class="ao__sub">Sistem durumu ve özet istatistikler</p>
  </div>

  <!-- Stats -->
  <div class="ao__stats">
    @for (s of stats; track s.label) {
      <div class="ao-stat">
        <div class="ao-stat__icon" [style.background]="s.color + '18'" [style.color]="s.color">
          <i [class]="'pi ' + s.icon"></i>
        </div>
        <div class="ao-stat__body">
          <span class="ao-stat__val">{{ s.value }}</span>
          <span class="ao-stat__lbl">{{ s.label }}</span>
        </div>
        <span class="ao-stat__trend" [class.ao-stat__trend--up]="s.up" [class.ao-stat__trend--down]="!s.up">
          <i [class]="'pi ' + (s.up ? 'pi-arrow-up' : 'pi-arrow-down')"></i> {{ s.trend }}
        </span>
      </div>
    }
  </div>

  <div class="ao__grid">
    <!-- Recent Orders -->
    <div class="ao-card">
      <div class="ao-card__head">
        <h2 class="ao-card__title">Son Siparişler</h2>
        <a routerLink="/admin/orders" class="ao-card__link">Tümünü Gör</a>
      </div>
      <table class="ao-table">
        <thead><tr>
          <th>Sipariş</th><th>Kullanıcı</th><th>Araç</th><th>Durum</th><th>Tarih</th>
        </tr></thead>
        <tbody>
          @for (o of recentOrders; track o.id) {
            <tr>
              <td class="ao-table__id">{{ o.id }}</td>
              <td>{{ o.user }}</td>
              <td>{{ o.vehicle }}</td>
              <td><span class="ao-badge ao-badge--{{ o.statusKey }}">{{ o.status }}</span></td>
              <td class="ao-table__date">{{ o.date }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Open Tickets -->
    <div class="ao-card">
      <div class="ao-card__head">
        <h2 class="ao-card__title">Açık Ticketlar</h2>
        <a routerLink="/admin/tickets" class="ao-card__link">Tümünü Gör</a>
      </div>
      <div class="ao-ticket-list">
        @for (t of openTickets; track t.id) {
          <div class="ao-tkt">
            <div class="ao-tkt__left">
              <span class="ao-badge ao-badge--{{ t.statusKey }}">{{ t.status }}</span>
              <div>
                <p class="ao-tkt__subject">{{ t.subject }}</p>
                <p class="ao-tkt__meta">{{ t.user }} · {{ t.order }}</p>
              </div>
            </div>
            <span class="ao-tkt__date">{{ t.date }}</span>
          </div>
        }
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    .ao { display: flex; flex-direction: column; gap: 1.5rem; }
    .ao__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .ao__sub { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }

    .ao__stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
    .ao-stat {
      background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px;
      padding: 1.25rem 1.5rem; display: flex; align-items: center; gap: 1rem;
      &__icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; i { font-size: 1.2rem; } }
      &__body { display: flex; flex-direction: column; flex: 1; }
      &__val { font-size: 1.6rem; font-weight: 800; color: #fff; line-height: 1; }
      &__lbl { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 3px; }
      &__trend { font-size: 0.7rem; font-weight: 600; display: flex; align-items: center; gap: 2px; margin-left: auto; flex-shrink: 0;
        &--up { color: #4ade80; } &--down { color: #f87171; }
        i { font-size: 0.6rem; }
      }
    }

    .ao__grid { display: grid; grid-template-columns: 1fr 380px; gap: 1.25rem; @media(max-width:1024px){ grid-template-columns: 1fr; } }

    .ao-card {
      background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 1.5rem;
      &__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
      &__title { font-size: 0.9rem; font-weight: 700; color: #fff; margin: 0; }
      &__link { font-size: 0.75rem; color: #f59e0b; text-decoration: none; &:hover { opacity: 0.8; } }
    }

    .ao-table { width: 100%; border-collapse: collapse; font-size: 0.8rem;
      th { color: rgba(255,255,255,0.3); font-weight: 600; text-transform: uppercase; font-size: 0.65rem; letter-spacing: .05em; padding: 0 0 0.75rem; text-align: left; }
      td { padding: 0.65rem 0; border-top: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.75); vertical-align: middle; }
      &__id { color: #f59e0b; font-weight: 700; font-family: monospace; }
      &__date { color: rgba(255,255,255,0.3); }
    }

    .ao-badge {
      display: inline-flex; padding: 0.18rem 0.55rem; border-radius: 6px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
      &--pending  { background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
      &--processing{ background: rgba(96,165,250,0.12); color: #60a5fa; border: 1px solid rgba(96,165,250,0.2); }
      &--completed{ background: rgba(74,222,128,0.12); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
      &--open     { background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
      &--resolved { background: rgba(74,222,128,0.12); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
    }

    .ao-ticket-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .ao-tkt {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem;
      padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 10px;
      &__left { display: flex; align-items: flex-start; gap: 0.6rem; }
      &__subject { font-size: 0.8rem; font-weight: 600; color: #fff; margin: 0 0 2px; }
      &__meta { font-size: 0.7rem; color: rgba(255,255,255,0.3); margin: 0; }
      &__date { font-size: 0.68rem; color: rgba(255,255,255,0.25); flex-shrink: 0; margin-top: 2px; }
    }
  `],
})
export class AdminOverviewPage {
  protected readonly stats = [
    { label: 'Toplam Kullanıcı', value: '248',  icon: 'pi-users',         color: '#60a5fa', trend: '+12 bu ay', up: true },
    { label: 'Aktif Bayiler',    value: '18',   icon: 'pi-building',      color: '#f59e0b', trend: '+2 bu ay',  up: true },
    { label: 'Toplam Sipariş',   value: '1.240',icon: 'pi-shopping-cart', color: '#e63946', trend: '+48 bu ay', up: true },
    { label: 'Açık Ticketlar',   value: '7',    icon: 'pi-comments',      color: '#a78bfa', trend: '-3 bu hafta', up: false },
  ];

  protected readonly recentOrders = [
    { id: 'ORD-048', user: 'Ali Yıldız',    vehicle: 'BMW M3 G80 Stage 1', status: 'Beklemede',   statusKey: 'pending',   date: '29 May' },
    { id: 'ORD-047', user: 'Mert Kaya',     vehicle: 'Audi RS6 Stage 2',   status: 'İşlemde',     statusKey: 'processing',date: '28 May' },
    { id: 'ORD-046', user: 'Selin Demir',   vehicle: 'VW Golf R Stage 1',  status: 'Tamamlandı',  statusKey: 'completed', date: '27 May' },
    { id: 'ORD-045', user: 'Emre Şahin',    vehicle: 'Porsche 911 Stage 3',status: 'Tamamlandı',  statusKey: 'completed', date: '26 May' },
    { id: 'ORD-044', user: 'Zeynep Arslan', vehicle: 'Mercedes C63 Stage 2',status:'İşlemde',     statusKey: 'processing',date: '25 May' },
  ];

  protected readonly openTickets = [
    { id: 'TKT-003', user: 'Ali Yıldız',  order: 'ORD-003', subject: 'DPF ışığı hala yanıyor',            status: 'Açık',      statusKey: 'open',    date: '18 Mar' },
    { id: 'TKT-001', user: 'Ali Yıldız',  order: 'ORD-001', subject: 'Yazılım sonrası rölantide titreme', status: 'Beklemede', statusKey: 'pending', date: '12 May' },
    { id: 'TKT-005', user: 'Mert Kaya',   order: 'ORD-047', subject: 'Stage 2 sonrası DTC kodları',       status: 'Açık',      statusKey: 'open',    date: '28 May' },
  ];
}
