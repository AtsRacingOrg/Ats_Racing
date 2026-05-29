import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

interface AdminOrder {
  id: string; user: string; email: string;
  vehicle: string; stage: string; ecu: string;
  status: OrderStatus;
  date: string; price: string;
  vin?: string; km?: string; transmission?: string;
  notes?: string;
  fileUploaded: boolean;
  fileSent: boolean;
  sentFileName?: string;
}

const MOCK_ORDERS: AdminOrder[] = [
  { id: 'ORD-048', user: 'Ali Yıldız',    email: 'kullanici@atsracing.com', vehicle: 'BMW M3 G80',        stage: 'Stage 1', ecu: 'Bosch MG1',      status: 'pending',    date: '29 May 2026', price: '₺2.500', vin: 'WBA7E2103MCH52841', km: '12.000', transmission: 'Manuel',   notes: 'Decat paketi de isteniyor.',  fileUploaded: false, fileSent: false },
  { id: 'ORD-047', user: 'Mert Kaya',     email: 'mert@gmail.com',          vehicle: 'Audi RS6 C8',       stage: 'Stage 2', ecu: 'Bosch MED17',    status: 'processing', date: '28 May 2026', price: '₺4.000', vin: 'WAUZZZ4G8KN012345', km: '8.500',  transmission: 'Otomatik', notes: '',                            fileUploaded: true,  fileSent: false },
  { id: 'ORD-046', user: 'Selin Demir',   email: 'selin@hotmail.com',       vehicle: 'VW Golf R Mk8',     stage: 'Stage 1', ecu: 'Bosch MG1CS',    status: 'completed',  date: '27 May 2026', price: '₺2.500', vin: 'WVWZZZ1KZMW123456', km: '5.200',  transmission: 'DSG',      notes: '',                            fileUploaded: true,  fileSent: true,  sentFileName: 'vw_golf_r_mk8_stage1_v2.bin' },
  { id: 'ORD-045', user: 'Emre Şahin',   email: 'emre@outlook.com',        vehicle: 'Porsche 911 Turbo', stage: 'Stage 3', ecu: 'Bosch ME7',      status: 'completed',  date: '26 May 2026', price: '₺7.500', vin: 'WP0ZZZ99ZLS123456', km: '22.000', transmission: 'PDK',      notes: 'OPF silme dahil.',            fileUploaded: true,  fileSent: true,  sentFileName: 'porsche_911_stage3_opf.bin' },
  { id: 'ORD-044', user: 'Zeynep Arslan', email: 'zeynep@gmail.com',        vehicle: 'Mercedes C63 AMG',  stage: 'Stage 2', ecu: 'Siemens SIM266', status: 'processing', date: '25 May 2026', price: '₺4.000', vin: 'WDDGF4HB3FR123456', km: '31.000', transmission: 'Otomatik', notes: '',                            fileUploaded: false, fileSent: false },
  { id: 'ORD-043', user: 'Berk Öztürk',  email: 'berk@gmail.com',          vehicle: 'BMW M5 F90',        stage: 'Stage 1', ecu: 'Bosch MG1',      status: 'pending',    date: '24 May 2026', price: '₺2.500', vin: 'WBSJF0C59LC123456', km: '4.100',  transmission: 'Otomatik', notes: '',                            fileUploaded: false, fileSent: false },
  { id: 'ORD-042', user: 'Mert Kaya',     email: 'mert@gmail.com',          vehicle: 'Audi S3 8Y',        stage: 'Stage 3', ecu: 'Bosch MED17',    status: 'cancelled',  date: '20 May 2026', price: '₺7.500', vin: '',                  km: '',       transmission: '',         notes: 'Müşteri iptal etti.',         fileUploaded: false, fileSent: false },
];

const STATUS_LABEL: Record<OrderStatus, string> = { pending: 'Beklemede', processing: 'İşlemde', completed: 'Tamamlandı', cancelled: 'İptal' };

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="aor">

  @if (currentView() === 'list') {

    <!-- ══ LIST VIEW ══ -->
    <div class="aor__header">
      <div>
        <h1 class="aor__title">Siparişler</h1>
        <p class="aor__sub">{{ filtered().length }} sipariş listeleniyor</p>
      </div>
      <div class="aor__actions">
        <div class="aor-search">
          <i class="pi pi-search"></i>
          <input type="text" placeholder="Sipariş veya kullanıcı ara…"
            [ngModel]="search()" (ngModelChange)="search.set($event)" />
        </div>
        <select class="aor-filter"
          [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event)">
          <option value="">Tüm Durumlar</option>
          <option value="pending">Beklemede</option>
          <option value="processing">İşlemde</option>
          <option value="completed">Tamamlandı</option>
          <option value="cancelled">İptal</option>
        </select>
      </div>
    </div>

    <!-- Status quick-filter tabs -->
    <div class="aor__status-bar">
      @for (s of statusTabs; track s.key) {
        <button class="aor-stab" type="button"
          [class.aor-stab--active]="filterStatus() === s.key"
          (click)="filterStatus.set(filterStatus() === s.key ? '' : s.key)">
          <span class="aor-stab__dot aor-stab__dot--{{ s.key }}"></span>
          {{ s.label }}
          <span class="aor-stab__count">{{ countByStatus(s.key) }}</span>
        </button>
      }
    </div>

    <!-- Orders table -->
    <div class="aor-table-wrap">
      <table class="aor-table">
        <thead><tr>
          <th>Sipariş</th><th>Müşteri</th><th>Araç</th><th>Durum</th>
          <th>Dosya</th><th>Tarih</th><th>Fiyat</th><th></th>
        </tr></thead>
        <tbody>
          @for (o of filtered(); track o.id) {
            <tr class="aor-row" (click)="openDetail(o)">
              <td class="aor-row__id">{{ o.id }}</td>
              <td>
                <div class="aor-user-cell">
                  <div class="aor-avatar">{{ initials(o.user) }}</div>
                  <div>
                    <p class="aor-user-cell__name">{{ o.user }}</p>
                    <p class="aor-user-cell__email">{{ o.email }}</p>
                  </div>
                </div>
              </td>
              <td>
                <p class="aor-row__vehicle">{{ o.vehicle }}</p>
                <span class="aor-stage aor-stage--{{ stageKey(o.stage) }}">{{ o.stage }}</span>
              </td>
              <td>
                <span class="aor-status aor-status--{{ o.status }}">
                  <span class="aor-status__dot"></span>{{ statusLabel(o.status) }}
                </span>
              </td>
              <td>
                @if (o.fileSent) {
                  <span class="aor-file-chip aor-file-chip--sent"><i class="pi pi-check-circle"></i> Gönderildi</span>
                } @else if (o.fileUploaded) {
                  <span class="aor-file-chip aor-file-chip--ready"><i class="pi pi-file"></i> Hazır</span>
                } @else if (o.status !== 'completed' && o.status !== 'cancelled') {
                  <span class="aor-file-chip aor-file-chip--missing"><i class="pi pi-clock"></i> Bekleniyor</span>
                } @else {
                  <span class="aor-muted">—</span>
                }
              </td>
              <td class="aor-muted">{{ o.date }}</td>
              <td class="aor-row__price">{{ o.price }}</td>
              <td>
                <button class="aor-icon-btn" type="button" (click)="$event.stopPropagation(); openDetail(o)">
                  <i class="pi pi-chevron-right"></i>
                </button>
              </td>
            </tr>
          }
          @if (filtered().length === 0) {
            <tr><td colspan="8" class="aor-empty-td"><i class="pi pi-inbox"></i><p>Sipariş bulunamadı</p></td></tr>
          }
        </tbody>
      </table>
    </div>

  } @else {

    <!-- ══ DETAIL VIEW ══ -->
    @if (selectedOrder(); as o) {
      <div class="aor-detail-page">

        <!-- Back bar -->
        <div class="aor-detail-page__topbar">
          <button class="aor-back-btn" type="button" (click)="goBack()">
            <i class="pi pi-arrow-left"></i> Siparişler
          </button>
          <span class="aor-breadcrumb">/ {{ o.id }}</span>
        </div>

        <div class="aor-detail-page__grid">

          <!-- Left column -->
          <div class="aor-detail-page__left">

            <!-- Order header -->
            <div class="aor-dp-card">
              <div class="aor-dp-card__head">
                <div>
                  <h1 class="aor-dp__id">{{ o.id }}</h1>
                  <p class="aor-dp__date">{{ o.date }}</p>
                </div>
                <span class="aor-status aor-status--{{ o.status }}">
                  <span class="aor-status__dot"></span>{{ statusLabel(o.status) }}
                </span>
              </div>
            </div>

            <!-- Customer -->
            <div class="aor-dp-card">
              <h2 class="aor-dp-card__title">Müşteri</h2>
              <div class="aor-dp__user-row">
                <div class="aor-dp__avatar">{{ initials(o.user) }}</div>
                <div>
                  <p class="aor-dp__user-name">{{ o.user }}</p>
                  <p class="aor-dp__user-email">{{ o.email }}</p>
                </div>
              </div>
            </div>

            <!-- Vehicle & order info -->
            <div class="aor-dp-card">
              <h2 class="aor-dp-card__title">Araç & Sipariş Bilgileri</h2>
              <div class="aor-info-grid">
                <div class="aor-info-item"><span class="aor-info-item__lbl">Araç</span><span class="aor-info-item__val">{{ o.vehicle }}</span></div>
                <div class="aor-info-item"><span class="aor-info-item__lbl">Stage</span>
                  <span class="aor-stage aor-stage--{{ stageKey(o.stage) }}">{{ o.stage }}</span>
                </div>
                <div class="aor-info-item"><span class="aor-info-item__lbl">ECU</span><span class="aor-info-item__val">{{ o.ecu }}</span></div>
                <div class="aor-info-item"><span class="aor-info-item__lbl">Ücret</span><span class="aor-info-item__val aor-info-item__val--price">{{ o.price }}</span></div>
                @if (o.transmission) {
                  <div class="aor-info-item"><span class="aor-info-item__lbl">Şanzıman</span><span class="aor-info-item__val">{{ o.transmission }}</span></div>
                }
                @if (o.km) {
                  <div class="aor-info-item"><span class="aor-info-item__lbl">Kilometre</span><span class="aor-info-item__val">{{ o.km }} km</span></div>
                }
                @if (o.vin) {
                  <div class="aor-info-item aor-info-item--full">
                    <span class="aor-info-item__lbl">VIN</span>
                    <span class="aor-info-item__val aor-info-item__val--mono">{{ o.vin }}</span>
                  </div>
                }
              </div>
              @if (o.notes) {
                <div class="aor-notes"><i class="pi pi-comment"></i> {{ o.notes }}</div>
              }
            </div>

          </div>

          <!-- Right column -->
          <div class="aor-detail-page__right">

            <!-- Status change -->
            @if (o.status !== 'cancelled') {
              <div class="aor-dp-card">
                <h2 class="aor-dp-card__title">Sipariş Durumu</h2>
                <div class="aor-status-steps">
                  @for (s of statusSteps; track s.key) {
                    <button type="button" class="aor-status-step"
                      [class.aor-status-step--active]="o.status === s.key"
                      [class.aor-status-step--done]="statusRank(o.status) > statusRank(s.key)"
                      (click)="setStatus(o, s.key)">
                      <span class="aor-status-step__dot aor-status-step__dot--{{ s.key }}"></span>
                      <span>{{ s.label }}</span>
                      @if (statusRank(o.status) > statusRank(s.key)) {
                        <i class="pi pi-check aor-status-step__check"></i>
                      }
                    </button>
                  }
                </div>
              </div>
            }

            <!-- File section -->
            <div class="aor-dp-card">
              <h2 class="aor-dp-card__title">Yazılım Dosyası</h2>

              @if (o.fileSent && o.sentFileName && !reuploadMode()) {
                <!-- Sent file — show & allow change -->
                <div class="aor-file-sent-card">
                  <div class="aor-file-sent-card__icon"><i class="pi pi-file-check"></i></div>
                  <div class="aor-file-sent-card__info">
                    <p class="aor-file-sent-card__name">{{ o.sentFileName }}</p>
                    <p class="aor-file-sent-card__sub">Müşteriye gönderildi</p>
                  </div>
                </div>
                <button class="aor-change-file-btn" type="button" (click)="reuploadMode.set(true)">
                  <i class="pi pi-refresh"></i> Dosyayı Değiştir
                </button>

              } @else if (o.status !== 'cancelled') {
                <!-- Upload zone -->
                @if (reuploadMode() && o.sentFileName) {
                  <p class="aor-reupload-note"><i class="pi pi-info-circle"></i> Yeni dosya yükleyerek eskisinin üzerine yazabilirsiniz.</p>
                }
                <div class="aor-upload-zone" [class.aor-upload-zone--filled]="selectedFile(o.id)"
                  (dragover)="$event.preventDefault()" (drop)="onDrop($event, o.id)">
                  @if (!selectedFile(o.id)) {
                    <i class="pi pi-cloud-upload"></i>
                    <p>Dosyayı buraya sürükle veya seç</p>
                    <label class="aor-upload-btn">
                      <i class="pi pi-folder-open"></i> Dosya Seç
                      <input type="file" accept=".bin,.ori,.hex,.mod" (change)="onFileSelect($event, o.id)" style="display:none" />
                    </label>
                  } @else {
                    <i class="pi pi-file" style="color:#4ade80; font-size:1.4rem"></i>
                    <span class="aor-upload-fname">{{ selectedFile(o.id)!.name }}</span>
                    <button type="button" class="aor-remove-file" (click)="removeFile(o.id)"><i class="pi pi-times"></i></button>
                  }
                </div>
                <div class="aor-upload-actions">
                  <button class="aor-send-btn" type="button"
                    [disabled]="!selectedFile(o.id)"
                    (click)="sendFile(o)">
                    <i class="pi pi-send"></i>
                    {{ o.fileSent ? 'Dosyayı Güncelle & Gönder' : 'Müşteriye Gönder' }}
                  </button>
                  @if (reuploadMode()) {
                    <button class="aor-cancel-btn" type="button" (click)="reuploadMode.set(false); removeFile(o.id)">İptal</button>
                  }
                </div>
                <p class="aor-upload-note">
                  <i class="pi pi-info-circle"></i>
                  {{ o.fileSent ? 'Yeni dosya gönderildikten sonra müşteri güncel versiyonu indirebilir.' : 'Dosya gönderildiğinde sipariş otomatik olarak "Tamamlandı" statüsüne geçer.' }}
                </p>

              } @else {
                <p class="aor-muted">İptal edilen sipariş için dosya işlemi yapılamaz.</p>
              }
            </div>

          </div>
        </div>

      </div>
    }

  }
</div>
  `,
  styles: [`
    .aor { display: flex; flex-direction: column; gap: 1.25rem; }
    .aor__title  { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .aor__sub    { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
    .aor__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .aor__actions { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    .aor-muted { color: rgba(255,255,255,0.3) !important; font-size: 0.78rem; }

    .aor-search {
      display: flex; align-items: center; gap: 0.5rem;
      background: #13151c; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0 0.9rem;
      i { color: rgba(255,255,255,0.3); font-size: 0.8rem; }
      input { background: transparent; border: none; color: rgba(255,255,255,0.85); font-size: 0.85rem; padding: 0.6rem 0; width: 220px;
        &:focus { outline: none; } &::placeholder { color: rgba(255,255,255,0.2); }
      }
    }
    .aor-filter {
      background: #13151c; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
      padding: 0.6rem 1rem; color: rgba(255,255,255,0.75); font-size: 0.8rem; cursor: pointer; appearance: none; min-width: 140px;
      option { background: #1a1d27; }
    }

    /* Status quick-filter */
    .aor__status-bar { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .aor-stab {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.85rem; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08); background: #13151c; color: rgba(255,255,255,0.5); font-size: 0.78rem; cursor: pointer;
      transition: all 160ms;
      &:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.85); }
      &--active { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.2); color: #fff; }
      &__dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
        &--pending    { background: #fbbf24; }
        &--processing { background: #60a5fa; box-shadow: 0 0 4px #60a5fa88; }
        &--completed  { background: #4ade80; }
        &--cancelled  { background: rgba(255,255,255,0.2); }
      }
      &__count { background: rgba(255,255,255,0.08); border-radius: 10px; padding: 0 6px; font-size: 0.68rem; font-weight: 700; }
    }

    /* Table */
    .aor-table-wrap { background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; overflow: auto; }
    .aor-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; min-width: 700px;
      th { color: rgba(255,255,255,0.3); font-weight: 600; text-transform: uppercase; font-size: 0.65rem; letter-spacing: .05em; padding: 1rem 1.25rem 0.75rem; text-align: left; }
      td { padding: 0.85rem 1.25rem; border-top: 1px solid rgba(255,255,255,0.05); vertical-align: middle; color: rgba(255,255,255,0.8); }
    }
    .aor-row { cursor: pointer; transition: background 140ms; &:hover td { background: rgba(255,255,255,0.025); } }
    .aor-row__id    { font-family: monospace; font-size: 0.82rem; font-weight: 700; color: #f59e0b; }
    .aor-row__price { font-weight: 700; color: #fff; }
    .aor-row__vehicle { font-size: 0.85rem; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0 0 3px; }
    .aor-user-cell { display: flex; align-items: center; gap: 0.65rem;
      &__name  { font-size: 0.85rem; font-weight: 600; color: #fff; margin: 0 0 2px; }
      &__email { font-size: 0.7rem; color: rgba(255,255,255,0.35); margin: 0; }
    }
    .aor-avatar { width: 32px; height: 32px; border-radius: 8px; background: rgba(96,165,250,0.12); color: #60a5fa; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; flex-shrink: 0; }
    .aor-icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.4); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; &:hover { background: rgba(255,255,255,0.08); color: #fff; } }
    .aor-empty-td { text-align: center; padding: 3rem !important; color: rgba(255,255,255,0.3); i { font-size: 2rem; display: block; margin-bottom: 0.5rem; } p { margin: 0; font-size: 0.875rem; } }

    /* Shared chips */
    .aor-stage {
      display: inline-flex; padding: 0.13rem 0.45rem; border-radius: 5px; font-size: 0.65rem; font-weight: 700;
      &--s1 { background: rgba(96,165,250,0.12); color: #60a5fa; border: 1px solid rgba(96,165,250,0.25); }
      &--s2 { background: rgba(230,57,70,0.12);  color: #e63946; border: 1px solid rgba(230,57,70,0.25);  }
      &--s3 { background: rgba(167,139,250,0.12);color: #a78bfa; border: 1px solid rgba(167,139,250,0.25);}
    }
    .aor-status {
      display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; font-weight: 600;
      &__dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
      &--pending    { color: #fbbf24; .aor-status__dot { background: #fbbf24; } }
      &--processing { color: #60a5fa; .aor-status__dot { background: #60a5fa; box-shadow: 0 0 6px #60a5fa88; } }
      &--completed  { color: #4ade80; .aor-status__dot { background: #4ade80; } }
      &--cancelled  { color: rgba(255,255,255,0.3); .aor-status__dot { background: rgba(255,255,255,0.2); } }
    }
    .aor-file-chip {
      display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.18rem 0.55rem; border-radius: 6px; font-size: 0.68rem; font-weight: 600;
      i { font-size: 0.65rem; }
      &--sent    { background: rgba(74,222,128,0.1);  color: #4ade80;  border: 1px solid rgba(74,222,128,0.2);  }
      &--ready   { background: rgba(96,165,250,0.1);  color: #60a5fa;  border: 1px solid rgba(96,165,250,0.2);  }
      &--missing { background: rgba(251,191,36,0.08); color: #fbbf24;  border: 1px solid rgba(251,191,36,0.15); }
    }

    /* ══ DETAIL PAGE ══ */
    .aor-detail-page { display: flex; flex-direction: column; gap: 1.5rem; animation: fadeIn 220ms ease both; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    .aor-detail-page__topbar { display: flex; align-items: center; gap: 0.5rem; }
    .aor-back-btn {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.6); font-size: 0.82rem; cursor: pointer;
      transition: all 160ms; &:hover { background: rgba(255,255,255,0.07); color: #fff; border-color: rgba(255,255,255,0.2); }
      i { font-size: 0.75rem; }
    }
    .aor-breadcrumb { font-size: 0.82rem; color: rgba(255,255,255,0.3); }

    .aor-detail-page__grid { display: grid; grid-template-columns: 1fr 420px; gap: 1.25rem; align-items: start; @media(max-width:1100px) { grid-template-columns: 1fr; } }
    .aor-detail-page__left, .aor-detail-page__right { display: flex; flex-direction: column; gap: 1.25rem; }

    .aor-dp-card {
      background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 1.25rem;
      &__head { display: flex; align-items: flex-start; justify-content: space-between; }
      &__title { font-size: 0.75rem; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: .07em; margin: 0 0 1rem; }
    }
    .aor-dp__id    { font-family: monospace; font-size: 1.4rem; font-weight: 800; color: #f59e0b; margin: 0; }
    .aor-dp__date  { font-size: 0.78rem; color: rgba(255,255,255,0.35); margin: 4px 0 0; }
    .aor-dp__user-row  { display: flex; align-items: center; gap: 0.75rem; }
    .aor-dp__avatar    { width: 42px; height: 42px; border-radius: 12px; background: rgba(96,165,250,0.12); color: #60a5fa; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }
    .aor-dp__user-name  { font-size: 0.9rem; font-weight: 600; color: #fff; margin: 0 0 2px; }
    .aor-dp__user-email { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin: 0; }

    .aor-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
    .aor-info-item {
      display: flex; flex-direction: column; gap: 3px;
      &--full { grid-column: 1/-1; }
      &__lbl { font-size: 0.65rem; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: .04em; }
      &__val { font-size: 0.85rem; color: rgba(255,255,255,0.85); font-weight: 500; &--price { color: #fff; font-weight: 700; } &--mono { font-family: monospace; font-size: 0.75rem; } }
    }
    .aor-notes { margin-top: 0.85rem; display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.8rem; color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.03); border-radius: 8px; padding: 0.65rem 0.85rem; i { color: rgba(245,158,11,0.6); flex-shrink: 0; margin-top: 1px; } }

    /* Status steps */
    .aor-status-steps { display: flex; flex-direction: column; gap: 0.4rem; }
    .aor-status-step {
      display: flex; align-items: center; gap: 0.65rem; padding: 0.65rem 0.9rem; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.07); background: transparent; color: rgba(255,255,255,0.4); font-size: 0.82rem; cursor: pointer; text-align: left;
      transition: all 160ms; width: 100%;
      &:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.03); }
      &--active { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.2); color: #fff; font-weight: 600; }
      &--done   { color: rgba(255,255,255,0.3); cursor: default; &:hover { border-color: rgba(255,255,255,0.07); color: rgba(255,255,255,0.3); background: transparent; } }
      &__dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        &--pending    { background: #fbbf24; }
        &--processing { background: #60a5fa; box-shadow: 0 0 5px #60a5fa66; }
        &--completed  { background: #4ade80; }
      }
      &__check { margin-left: auto; font-size: 0.7rem; color: #4ade80; }
    }

    /* File upload */
    .aor-file-sent-card {
      display: flex; align-items: center; gap: 0.85rem; padding: 0.9rem 1rem; border-radius: 12px;
      background: rgba(74,222,128,0.07); border: 1px solid rgba(74,222,128,0.2); margin-bottom: 0.75rem;
      &__icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(74,222,128,0.15); color: #4ade80; display: flex; align-items: center; justify-content: center; flex-shrink: 0; i { font-size: 1.1rem; } }
      &__info { flex: 1; min-width: 0; }
      &__name { font-size: 0.82rem; font-weight: 600; color: #fff; margin: 0 0 2px; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      &__sub  { font-size: 0.7rem; color: rgba(74,222,128,0.7); margin: 0; }
    }
    .aor-change-file-btn { display: flex; align-items: center; gap: 0.4rem; width: 100%; justify-content: center; padding: 0.55rem; border-radius: 9px; border: 1px dashed rgba(255,255,255,0.12); background: transparent; color: rgba(255,255,255,0.4); font-size: 0.78rem; cursor: pointer; &:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.8); } i { font-size: 0.78rem; } }
    .aor-reupload-note { font-size: 0.75rem; color: rgba(251,191,36,0.7); margin: 0 0 0.65rem; display: flex; align-items: flex-start; gap: 0.4rem; i { flex-shrink: 0; margin-top: 1px; } }

    .aor-upload-zone {
      border: 2px dashed rgba(255,255,255,0.1); border-radius: 12px; background: rgba(255,255,255,0.02);
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1.5rem; text-align: center; margin-bottom: 0.75rem;
      i { font-size: 1.75rem; color: rgba(255,255,255,0.2); }
      p { font-size: 0.8rem; color: rgba(255,255,255,0.3); margin: 0; }
      &--filled { flex-direction: row; padding: 0.75rem 1rem; border-color: rgba(74,222,128,0.3); background: rgba(74,222,128,0.03); }
    }
    .aor-upload-btn { display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 0.4rem 0.85rem; font-size: 0.78rem; color: rgba(255,255,255,0.7); &:hover { background: rgba(255,255,255,0.12); } }
    .aor-upload-fname { flex: 1; font-size: 0.82rem; color: rgba(255,255,255,0.8); text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .aor-remove-file  { border: none; background: transparent; color: rgba(255,255,255,0.3); cursor: pointer; font-size: 0.8rem; &:hover { color: #fff; } flex-shrink: 0; }
    .aor-upload-actions { display: flex; gap: 0.6rem; margin-bottom: 0.65rem; }
    .aor-send-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.65rem; border-radius: 10px; border: none; cursor: pointer; background: linear-gradient(135deg,#4ade80,#16a34a); color: #000; font-size: 0.85rem; font-weight: 700; &:hover:not(:disabled) { opacity: 0.9; } &:disabled { opacity: 0.3; cursor: not-allowed; } }
    .aor-cancel-btn { padding: 0.65rem 1rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.5); font-size: 0.8rem; cursor: pointer; &:hover { background: rgba(255,255,255,0.06); color: #fff; } }
    .aor-upload-note { font-size: 0.72rem; color: rgba(255,255,255,0.3); margin: 0; display: flex; align-items: flex-start; gap: 0.4rem; i { flex-shrink: 0; color: rgba(245,158,11,0.5); } }
  `],
})
export class AdminOrdersPage {
  protected readonly orders       = signal<AdminOrder[]>(MOCK_ORDERS);
  protected readonly files        = signal<Record<string, File | null>>({});
  protected readonly search       = signal('');
  protected readonly filterStatus = signal<OrderStatus | ''>('');
  protected readonly currentView  = signal<'list' | 'detail'>('list');
  protected readonly selectedOrder = signal<AdminOrder | null>(null);
  protected readonly reuploadMode  = signal(false);

  protected readonly statusTabs = [
    { key: 'pending'    as OrderStatus, label: 'Beklemede'  },
    { key: 'processing' as OrderStatus, label: 'İşlemde'    },
    { key: 'completed'  as OrderStatus, label: 'Tamamlandı' },
    { key: 'cancelled'  as OrderStatus, label: 'İptal'      },
  ];
  protected readonly statusSteps = [
    { key: 'pending'    as OrderStatus, label: 'Beklemede'  },
    { key: 'processing' as OrderStatus, label: 'İşlemde'    },
    { key: 'completed'  as OrderStatus, label: 'Tamamlandı' },
  ];

  protected readonly filtered = computed(() => {
    let list = this.orders();
    const q = this.search().toLowerCase();
    if (q) { list = list.filter(o => o.id.toLowerCase().includes(q) || o.user.toLowerCase().includes(q) || o.vehicle.toLowerCase().includes(q)); }
    const s = this.filterStatus();
    if (s) { list = list.filter(o => o.status === s); }
    return list;
  });

  statusLabel(s: OrderStatus): string { return STATUS_LABEL[s]; }
  countByStatus(s: OrderStatus): number { return this.orders().filter(o => o.status === s).length; }
  initials(name: string): string { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
  stageKey(stage: string): string { return stage === 'Stage 1' ? 's1' : stage === 'Stage 2' ? 's2' : 's3'; }
  selectedFile(id: string): File | null { return this.files()[id] ?? null; }
  statusRank(s: OrderStatus): number { return { pending: 0, processing: 1, completed: 2, cancelled: -1 }[s]; }

  openDetail(o: AdminOrder): void {
    this.selectedOrder.set(o);
    this.reuploadMode.set(false);
    this.currentView.set('detail');
  }
  goBack(): void { this.currentView.set('list'); this.selectedOrder.set(null); }

  setStatus(o: AdminOrder, status: OrderStatus): void {
    if (o.status === status) { return; }
    this.orders.update(list => list.map(x => x.id === o.id ? { ...x, status } : x));
    this.selectedOrder.update(sel => sel?.id === o.id ? { ...sel, status } : sel);
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
  removeFile(orderId: string): void { this.files.update(m => ({ ...m, [orderId]: null })); }

  sendFile(o: AdminOrder): void {
    const file = this.files()[o.id];
    if (!file) { return; }
    const sentFileName = file.name;
    this.orders.update(list => list.map(x =>
      x.id === o.id ? { ...x, fileUploaded: true, fileSent: true, status: 'completed', sentFileName } : x
    ));
    this.selectedOrder.update(sel =>
      sel?.id === o.id ? { ...sel, fileUploaded: true, fileSent: true, status: 'completed', sentFileName } : sel
    );
    this.files.update(m => ({ ...m, [o.id]: null }));
    this.reuploadMode.set(false);
  }
}
