import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

interface AdminOrder {
  id: string; user: string; email: string;
  vehicle: string; stage: string;
  status: OrderStatus;
  date: string; price: string;
  fileUploaded: boolean; fileSent: boolean;
  showUpload?: boolean;
}

const MOCK_ORDERS: AdminOrder[] = [
  { id: 'ORD-048', user: 'Ali Yıldız',    email: 'kullanici@atsracing.com', vehicle: 'BMW M3 G80',         stage: 'Stage 1', status: 'pending',    date: '29 May 2026', price: '₺2.500', fileUploaded: false, fileSent: false },
  { id: 'ORD-047', user: 'Mert Kaya',     email: 'mert@gmail.com',          vehicle: 'Audi RS6 C8',        stage: 'Stage 2', status: 'processing', date: '28 May 2026', price: '₺4.000', fileUploaded: true,  fileSent: false },
  { id: 'ORD-046', user: 'Selin Demir',   email: 'selin@hotmail.com',       vehicle: 'VW Golf R Mk8',      stage: 'Stage 1', status: 'completed',  date: '27 May 2026', price: '₺2.500', fileUploaded: true,  fileSent: true  },
  { id: 'ORD-045', user: 'Emre Şahin',    email: 'emre@outlook.com',        vehicle: 'Porsche 911 Turbo',  stage: 'Stage 3', status: 'completed',  date: '26 May 2026', price: '₺7.500', fileUploaded: true,  fileSent: true  },
  { id: 'ORD-044', user: 'Zeynep Arslan', email: 'zeynep@gmail.com',        vehicle: 'Mercedes C63 AMG',   stage: 'Stage 2', status: 'processing', date: '25 May 2026', price: '₺4.000', fileUploaded: false, fileSent: false },
  { id: 'ORD-043', user: 'Berk Öztürk',   email: 'berk@gmail.com',          vehicle: 'BMW M5 F90',         stage: 'Stage 1', status: 'pending',    date: '24 May 2026', price: '₺2.500', fileUploaded: false, fileSent: false },
  { id: 'ORD-042', user: 'Mert Kaya',     email: 'mert@gmail.com',          vehicle: 'Audi S3 8Y',         stage: 'Stage 3', status: 'cancelled',  date: '20 May 2026', price: '₺7.500', fileUploaded: false, fileSent: false },
];

const STATUS_LABELS: Record<OrderStatus, string> = { pending: 'Beklemede', processing: 'İşlemde', completed: 'Tamamlandı', cancelled: 'İptal' };

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="aor">
  <div class="aor__header">
    <div>
      <h1 class="aor__title">Siparişler</h1>
      <p class="aor__sub">{{ filtered().length }} sipariş listeleniyor</p>
    </div>
    <div class="aor__actions">
      <div class="aor-search">
        <i class="pi pi-search"></i>
        <input type="text" placeholder="Sipariş veya kullanıcı ara…" [(ngModel)]="search" />
      </div>
      <div class="aor-filter-wrap">
        <select class="aor-filter" [(ngModel)]="filterStatus">
          <option value="">Tüm Durumlar</option>
          <option value="pending">Beklemede</option>
          <option value="processing">İşlemde</option>
          <option value="completed">Tamamlandı</option>
          <option value="cancelled">İptal</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Orders list -->
  <div class="aor-list">
    @for (o of filtered(); track o.id) {
      <div class="aor-row" [class.aor-row--expanded]="o.showUpload">

        <!-- Main row info -->
        <div class="aor-row__main">
          <div class="aor-row__id">{{ o.id }}</div>

          <div class="aor-row__user">
            <p class="aor-row__name">{{ o.user }}</p>
            <p class="aor-row__email">{{ o.email }}</p>
          </div>

          <div class="aor-row__vehicle">
            <p class="aor-row__vname">{{ o.vehicle }}</p>
            <span class="aor-stage-badge" [class.aor-stage-badge--s1]="o.stage==='Stage 1'" [class.aor-stage-badge--s2]="o.stage==='Stage 2'" [class.aor-stage-badge--s3]="o.stage==='Stage 3'">
              {{ o.stage }}
            </span>
          </div>

          <span class="aor-status aor-status--{{ o.status }}">
            <span class="aor-status__dot"></span>{{ statusLabel(o.status) }}
          </span>

          <span class="aor-price">{{ o.price }}</span>
          <span class="aor-date">{{ o.date }}</span>

          <!-- File state -->
          <div class="aor-file-state">
            @if (o.fileSent) {
              <span class="aor-file-chip aor-file-chip--sent"><i class="pi pi-check-circle"></i> Dosya Gönderildi</span>
            } @else if (o.fileUploaded) {
              <span class="aor-file-chip aor-file-chip--ready"><i class="pi pi-file"></i> Hazır</span>
            } @else {
              <span class="aor-file-chip aor-file-chip--missing"><i class="pi pi-clock"></i> Dosya Bekleniyor</span>
            }
          </div>

          <!-- Actions -->
          <div class="aor-row__actions">
            @if (!o.fileSent && o.status !== 'cancelled') {
              <button class="aor-btn aor-btn--upload" type="button" (click)="toggleUpload(o)" title="Dosya Yükle & Gönder">
                <i class="pi pi-upload"></i>
                <span>{{ o.showUpload ? 'Kapat' : 'Dosya Gönder' }}</span>
              </button>
            }
            <button class="aor-icon-btn" type="button" title="Durumu İlerlet" (click)="advanceStatus(o)" [disabled]="o.status === 'completed' || o.status === 'cancelled'">
              <i class="pi pi-arrow-right"></i>
            </button>
          </div>
        </div>

        <!-- Expandable file upload panel -->
        @if (o.showUpload) {
          <div class="aor-upload-panel">
            <div class="aor-upload-panel__inner">
              <div class="aor-upload-zone" [class.aor-upload-zone--filled]="selectedFiles()[o.id]"
                (dragover)="$event.preventDefault()" (drop)="onDrop($event, o.id)">
                @if (!selectedFiles()[o.id]) {
                  <div class="aor-upload-zone__empty">
                    <i class="pi pi-cloud-upload"></i>
                    <p>Yazılım dosyasını buraya sürükleyin</p>
                    <label class="aor-upload-zone__btn">
                      <i class="pi pi-folder-open"></i> Dosya Seç
                      <input type="file" accept=".bin,.ori,.hex,.mod" (change)="onFileSelect($event, o.id)" style="display:none" />
                    </label>
                  </div>
                } @else {
                  <div class="aor-upload-zone__filled">
                    <i class="pi pi-file"></i>
                    <span>{{ selectedFiles()[o.id]!.name }}</span>
                    <button type="button" (click)="removeFile(o.id)"><i class="pi pi-times"></i></button>
                  </div>
                }
              </div>
              <div class="aor-upload-panel__actions">
                <button class="aor-btn aor-btn--send" type="button"
                  [disabled]="!selectedFiles()[o.id]"
                  (click)="sendFile(o)">
                  <i class="pi pi-send"></i> Müşteriye Gönder
                </button>
              </div>
              <p class="aor-upload-panel__note">
                <i class="pi pi-info-circle"></i>
                Dosya gönderildikten sonra sipariş otomatik olarak "Tamamlandı" statüsüne geçer ve müşteriye bildirim gönderilir.
              </p>
            </div>
          </div>
        }

      </div>
    }
  </div>
</div>
  `,
  styles: [`
    .aor { display: flex; flex-direction: column; gap: 1.5rem; }
    .aor__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .aor__sub { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
    .aor__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .aor__actions { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }

    .aor-search {
      display: flex; align-items: center; gap: 0.5rem;
      background: #13151c; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0 0.9rem;
      i { color: rgba(255,255,255,0.3); font-size: 0.8rem; }
      input { background: transparent; border: none; color: rgba(255,255,255,0.85); font-size: 0.85rem; padding: 0.6rem 0; width: 220px;
        &:focus { outline: none; } &::placeholder { color: rgba(255,255,255,0.2); }
      }
    }
    .aor-filter-wrap { position: relative; }
    .aor-filter {
      background: #13151c; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
      padding: 0.6rem 1rem; color: rgba(255,255,255,0.75); font-size: 0.8rem; cursor: pointer; appearance: none; min-width: 140px;
      option { background: #1a1d27; }
    }

    /* ── Order row ── */
    .aor-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .aor-row {
      background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden;
      transition: border-color 200ms;
      &--expanded { border-color: rgba(245,158,11,0.3); }
      &__main { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; flex-wrap: wrap; }
      &__id { font-family: monospace; font-size: 0.8rem; font-weight: 700; color: #f59e0b; min-width: 80px; }
      &__user { min-width: 160px; flex: 1; }
      &__name { font-size: 0.85rem; font-weight: 600; color: #fff; margin: 0 0 2px; }
      &__email { font-size: 0.7rem; color: rgba(255,255,255,0.35); margin: 0; }
      &__vehicle { min-width: 160px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
      &__vname { font-size: 0.85rem; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0; }
      &__actions { display: flex; gap: 0.5rem; align-items: center; margin-left: auto; }
    }

    .aor-stage-badge {
      display: inline-flex; padding: 0.15rem 0.5rem; border-radius: 5px; font-size: 0.65rem; font-weight: 700;
      &--s1 { background: rgba(96,165,250,0.12); color: #60a5fa; border: 1px solid rgba(96,165,250,0.25); }
      &--s2 { background: rgba(230,57,70,0.12);  color: #e63946; border: 1px solid rgba(230,57,70,0.25); }
      &--s3 { background: rgba(167,139,250,0.12);color: #a78bfa; border: 1px solid rgba(167,139,250,0.25); }
    }

    .aor-status { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; min-width: 100px;
      &__dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
      &--pending    { color: #fbbf24; .aor-status__dot { background: #fbbf24; } }
      &--processing { color: #60a5fa; .aor-status__dot { background: #60a5fa; box-shadow: 0 0 6px #60a5fa88; } }
      &--completed  { color: #4ade80; .aor-status__dot { background: #4ade80; } }
      &--cancelled  { color: rgba(255,255,255,0.3); .aor-status__dot { background: rgba(255,255,255,0.2); } }
    }

    .aor-price { font-size: 0.875rem; font-weight: 700; color: #fff; min-width: 70px; }
    .aor-date  { font-size: 0.75rem; color: rgba(255,255,255,0.3); min-width: 90px; }

    .aor-file-chip {
      display: inline-flex; align-items: center; gap: 0.35rem;
      padding: 0.25rem 0.65rem; border-radius: 8px; font-size: 0.7rem; font-weight: 600; white-space: nowrap;
      i { font-size: 0.7rem; }
      &--sent    { background: rgba(74,222,128,0.1);  color: #4ade80;  border: 1px solid rgba(74,222,128,0.2);  }
      &--ready   { background: rgba(96,165,250,0.1);  color: #60a5fa;  border: 1px solid rgba(96,165,250,0.2);  }
      &--missing { background: rgba(251,191,36,0.08); color: #fbbf24;  border: 1px solid rgba(251,191,36,0.15); }
    }

    .aor-btn {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.85rem; border-radius: 8px; border: none; cursor: pointer; font-size: 0.78rem; font-weight: 600;
      &--upload { background: rgba(245,158,11,0.12); color: #f59e0b; border: 1px solid rgba(245,158,11,0.25); &:hover { background: rgba(245,158,11,0.2); } }
      &--send   { background: linear-gradient(135deg,#4ade80,#16a34a); color: #000; &:hover:not(:disabled) { opacity: 0.9; } &:disabled { opacity: 0.35; cursor: not-allowed; } }
    }
    .aor-icon-btn {
      width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
      background: transparent; color: rgba(255,255,255,0.4); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;
      &:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: #fff; }
      &:disabled { opacity: 0.2; cursor: not-allowed; }
    }

    /* ── Upload panel ── */
    .aor-upload-panel {
      border-top: 1px solid rgba(245,158,11,0.2); background: rgba(245,158,11,0.03);
      padding: 1.25rem;
      &__inner { display: flex; flex-direction: column; gap: 0.75rem; max-width: 560px; }
      &__actions { display: flex; gap: 0.75rem; }
      &__note { font-size: 0.75rem; color: rgba(255,255,255,0.3); margin: 0; display: flex; align-items: flex-start; gap: 0.4rem; i { flex-shrink: 0; color: rgba(245,158,11,0.5); } }
    }
    .aor-upload-zone {
      border: 2px dashed rgba(255,255,255,0.12); border-radius: 12px; background: rgba(255,255,255,0.02);
      transition: border-color 200ms;
      &__empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1.5rem 1rem; text-align: center;
        i { font-size: 1.75rem; color: rgba(255,255,255,0.2); }
        p { font-size: 0.8rem; color: rgba(255,255,255,0.3); margin: 0; }
      }
      &__btn {
        display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer;
        background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px;
        padding: 0.4rem 0.85rem; font-size: 0.78rem; color: rgba(255,255,255,0.7);
        &:hover { background: rgba(255,255,255,0.12); }
      }
      &__filled { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem;
        i { color: #4ade80; }
        span { flex: 1; font-size: 0.82rem; color: rgba(255,255,255,0.8); }
        button { border: none; background: transparent; color: rgba(255,255,255,0.3); cursor: pointer; font-size: 0.8rem; &:hover { color: #fff; } }
      }
      &--filled { border-color: rgba(74,222,128,0.3); background: rgba(74,222,128,0.03); }
    }
  `],
})
export class AdminOrdersPage {
  protected readonly orders = signal<AdminOrder[]>(MOCK_ORDERS);
  protected search       = '';
  protected filterStatus = '';
  protected readonly files = signal<Record<string, File | null>>({});

  protected readonly filtered = computed(() => {
    let list = this.orders();
    if (this.search) { const q = this.search.toLowerCase(); list = list.filter(o => o.id.toLowerCase().includes(q) || o.user.toLowerCase().includes(q)); }
    if (this.filterStatus) { list = list.filter(o => o.status === this.filterStatus); }
    return list;
  });

  protected readonly selectedFiles = this.files.asReadonly();

  statusLabel(s: OrderStatus): string { return STATUS_LABELS[s]; }

  toggleUpload(o: AdminOrder): void {
    this.orders.update(list => list.map(x => x.id === o.id ? { ...x, showUpload: !x.showUpload } : x));
  }

  onFileSelect(ev: Event, orderId: string): void {
    const file = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.files.update(m => ({ ...m, [orderId]: file }));
  }

  onDrop(ev: DragEvent, orderId: string): void {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0] ?? null;
    if (file) { this.files.update(m => ({ ...m, [orderId]: file })); }
  }

  removeFile(orderId: string): void {
    this.files.update(m => ({ ...m, [orderId]: null }));
  }

  sendFile(o: AdminOrder): void {
    if (!this.files()[o.id]) { return; }
    this.orders.update(list => list.map(x =>
      x.id === o.id ? { ...x, fileUploaded: true, fileSent: true, status: 'completed', showUpload: false } : x
    ));
    this.files.update(m => ({ ...m, [o.id]: null }));
  }

  advanceStatus(o: AdminOrder): void {
    const next: Record<OrderStatus, OrderStatus> = { pending: 'processing', processing: 'completed', completed: 'completed', cancelled: 'cancelled' };
    this.orders.update(list => list.map(x => x.id === o.id ? { ...x, status: next[x.status] } : x));
  }
}
