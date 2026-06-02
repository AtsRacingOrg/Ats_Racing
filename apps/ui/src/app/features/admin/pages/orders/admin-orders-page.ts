import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, effect, inject, signal, computed } from '@angular/core';
import { PageLoader } from '../../../../shared/page-loader';
import { Paginator } from '../../../../shared/paginator';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Order, OrdersService } from '../../../../core/orders/orders.service';
import { fuelLabelTr, stageLabel, formatTrDate, formatTrDateTime, formatTl, triggerDownload } from '../../../../core/orders/order-format';

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

interface TimelineEvent { date: string; event: string; by?: string; }

interface AdminOrder {
  id: string; dbId: string; date: string;
  user: string; email: string; phone?: string;
  make: string; model: string; year: number;
  engine: string; fuelType: string; transmission: string;
  vin: string; km: string; plate: string;
  stage: string; ecu: string; readMethod: string;
  virtualFile: boolean; dyno: boolean;
  ecuHw: string; ecuPart: string; ecuSw: string;
  extraServices: string[];
  price: string; basePrice: string;
  status: OrderStatus;
  notes?: string;
  pcodes: { pcode: string | null; note: string | null }[];
  modifiedParts: string[];
  originalFileUploaded: boolean; originalFileName?: string;
  fileUploaded: boolean; fileSent: boolean; sentFileName?: string; sentFileNote?: string | null;
  queuePosition: number | null; queueTotal: number;
  cancellationReason: string | null;
  timeline: TimelineEvent[];
  priceMap: Record<string, number>;
  extrasTotalValue: number;
}

const ROLE_LABEL: Record<string, string> = { admin: 'Admin', user: 'Müşteri', dealer: 'Bayi' };

function mapAdminOrder(o: Order): AdminOrder {
  const items = o.items ?? [];
  const original = o.files.find(f => f.kind === 'original');
  const delivered = o.files.find(f => f.kind === 'delivered');
  return {
    id: o.orderNo,
    dbId: o.id,
    date: formatTrDateTime(o.createdAt),
    user: o.customer?.fullName ?? '—',
    email: o.customer?.email ?? '',
    phone: o.customer?.phone ?? undefined,
    make: o.make ?? '',
    model: o.model ?? '',
    year: o.year ?? 0,
    engine: o.engineLabel ?? '',
    fuelType: fuelLabelTr(o.fuel),
    transmission: o.transmission ?? '',
    vin: o.vin ?? '',
    km: o.km ?? '',
    plate: o.plate ?? '',
    stage: stageLabel(o.stage),
    ecu: o.ecu ?? '',
    readMethod: o.readingTool ?? '',
    virtualFile: o.virtualFile,
    dyno: o.dyno,
    ecuHw: o.ecuHw ?? '',
    ecuPart: o.ecuPart ?? '',
    ecuSw: o.ecuSw ?? '',
    extraServices: items.map(i => i.label),
    price: formatTl(o.totalPrice),
    basePrice: formatTl(o.basePrice),
    status: o.status,
    notes: o.notes ?? undefined,
    pcodes: o.pcodes ?? [],
    modifiedParts: o.modifiedParts ?? [],
    originalFileUploaded: !!original,
    originalFileName: original?.fileName,
    fileUploaded: !!delivered,
    fileSent: !!delivered,
    sentFileName: delivered?.fileName,
    sentFileNote: delivered?.notes ?? null,
    queuePosition: o.queuePosition,
    queueTotal: o.queueTotal,
    cancellationReason: o.cancellationReason ?? null,
    timeline: (o.events ?? []).map(e => ({
      date: formatTrDateTime(e.createdAt),
      event: e.event,
      by: e.actorRole ? (ROLE_LABEL[e.actorRole] ?? e.actorRole) : undefined,
    })),
    priceMap: Object.fromEntries(items.map(i => [i.label, i.unitPrice])),
    extrasTotalValue: o.extrasTotal,
  };
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Hazırlanıyor', processing: 'Hazırlanıyor', completed: 'Tamamlandı', cancelled: 'İptal'
};

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [FormsModule, DecimalPipe, PageLoader, Paginator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
@if (loading()) { <app-page-loader /> } @else {
<div class="aor">

  @if (currentView() === 'list') {
  <!-- ══ LIST ══ -->
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
      <select class="aor-filter" [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event)">
        <option value="">Tüm Durumlar</option>
        <option value="pending">Hazırlanıyor</option>
        <option value="completed">Tamamlandı</option>
        <option value="cancelled">İptal</option>
      </select>
    </div>
  </div>

  <div class="aor__status-bar">
    @for (s of statusTabs; track s.key) {
      <button class="aor-stab" type="button"
        [class.aor-stab--active]="filterStatus() === s.key"
        (click)="filterStatus.set(filterStatus() === s.key ? '' : s.key)">
        <span class="aor-stab__dot aor-stab__dot--{{s.key}}"></span>
        {{ s.label }}
        <span class="aor-stab__count">{{ countByStatus(s.key) }}</span>
      </button>
    }
  </div>

  <div class="aor-table-wrap">
    <table class="aor-table">
      <thead><tr>
        <th>Sipariş</th><th>Müşteri</th><th>Araç / Servis</th><th>Yıl</th><th>Motor</th>
        <th>ECU & Yöntem</th><th>Şanzıman</th><th>KM</th><th>Plaka</th>
        <th>Durum</th><th>Dosya</th><th>Tarih</th><th>Fiyat</th><th></th>
      </tr></thead>
      <tbody>
        @for (o of paged(); track o.id) {
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
              <p class="aor-row__vehicle">{{ o.make }} {{ o.model }}</p>
              <div class="aor-row__tags">
                <span class="aor-stage aor-stage--{{stageKey(o.stage)}}">{{ o.stage }}</span>
                @for (ex of o.extraServices.slice(0,2); track ex) {
                  <span class="aor-extra-chip">{{ ex }}</span>
                }
                @if (o.extraServices.length > 2) {
                  <span class="aor-extra-chip">+{{ o.extraServices.length - 2 }}</span>
                }
              </div>
            </td>
            <td class="aor-muted">{{ o.year || '—' }}</td>
            <td class="aor-muted">{{ o.engine || '—' }}</td>
            <td>
              <p class="aor-row__ecu">{{ o.ecu || '—' }}</p>
              <span class="aor-method-chip">{{ o.readMethod }}</span>
            </td>
            <td class="aor-muted">{{ o.transmission || '—' }}</td>
            <td class="aor-muted">{{ o.km ? o.km + ' km' : '—' }}</td>
            <td class="aor-muted" style="text-transform:uppercase">{{ o.plate || '—' }}</td>
            <td>
              <span class="aor-status aor-status--{{o.status}}">
                <span class="aor-status__dot"></span>{{ statusLabel(o.status) }}
              </span>
              @if (o.queuePosition) {
                <span class="aor-queue-chip" title="Kuyruk sırası">
                  <i class="pi pi-sort-numeric-down"></i> {{ o.queuePosition }}. sırada
                </span>
              }
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
          <tr><td colspan="14" class="aor-empty-td"><i class="pi pi-inbox"></i><p>Sipariş bulunamadı</p></td></tr>
        }
      </tbody>
    </table>
    <app-paginator [total]="filtered().length" [(page)]="page" [pageSize]="pageSize" />
  </div>

  } @else {
  <!-- ══ DETAIL ══ -->
  @if (selectedOrder(); as o) {
  <div class="aor-detail">

    <!-- Topbar -->
    <div class="aor-detail__topbar">
      <button class="aor-back-btn" type="button" (click)="goBack()">
        <i class="pi pi-arrow-left"></i> Siparişler
      </button>
      <span class="aor-breadcrumb">/ {{ o.id }}</span>
      @if (o.queuePosition) {
        <span class="aor-queue-chip aor-queue-chip--lg" style="margin-left:auto" title="Kuyruk sırası">
          <i class="pi pi-sort-numeric-down"></i> {{ o.queuePosition }}. sırada
        </span>
      }
      <span class="aor-status aor-status--{{o.status}}" [style.margin-left]="o.queuePosition ? '0.6rem' : 'auto'">
        <span class="aor-status__dot"></span>{{ statusLabel(o.status) }}
      </span>
    </div>

    <!-- Progress stepper -->
    @if (o.status !== 'cancelled') {
      <div class="aor-progress">
        @for (step of progressSteps; track step.rank; let last = $last) {
          <div class="aor-ps"
            [class.aor-ps--done]="progressRank(o.status) > step.rank"
            [class.aor-ps--active]="progressRank(o.status) === step.rank">
            <div class="aor-ps__circle">
              @if (progressRank(o.status) > step.rank) {
                <i class="pi pi-check" style="font-size:0.7rem"></i>
              } @else {
                <i [class]="'pi ' + step.icon" style="font-size:0.75rem"></i>
              }
            </div>
            <span class="aor-ps__label">{{ step.label }}</span>
          </div>
          @if (!last) {
            <div class="aor-ps-line" [class.aor-ps-line--done]="progressRank(o.status) > step.rank"></div>
          }
        }
      </div>
    } @else {
      <div class="aor-cancelled-banner">
        <i class="pi pi-times-circle"></i>
        <div>
          <p style="margin:0;font-weight:600">Bu sipariş iptal edilmiştir.</p>
          @if (o.cancellationReason) {
            <p style="margin:0.25rem 0 0;font-size:0.8rem;color:rgba(255,255,255,0.7);white-space:pre-wrap">
              <strong style="color:#f87171">Sebep:</strong> {{ o.cancellationReason }}
            </p>
          }
        </div>
      </div>
    }

    <!-- Two-column grid -->
    <div class="aor-detail__grid">

      <!-- LEFT -->
      <div class="aor-detail__left">

        <!-- STEP 1: Sipariş Bilgileri -->
        <div class="step-card">
          <div class="step-card__head">
            <div class="step-num">1</div>
            <div>
              <p class="step-card__title">Sipariş Bilgileri</p>
              <p class="step-card__sub">Sipariş numarası, tarih ve toplam ücret</p>
            </div>
          </div>
          <div class="aord-info-row">
            <div class="aord-info-item">
              <span class="aord-info-item__k">Sipariş No</span>
              <span class="aord-info-item__v aord-info-item__v--id">{{ o.id }}</span>
            </div>
            <div class="aord-info-item">
              <span class="aord-info-item__k">Tarih</span>
              <span class="aord-info-item__v">{{ o.date }}</span>
            </div>
            <div class="aord-info-item">
              <span class="aord-info-item__k">Toplam Ücret</span>
              <span class="aord-info-item__v aord-info-item__v--price">{{ o.price }}</span>
            </div>
          </div>
        </div>

        <!-- STEP 2: Müşteri -->
        <div class="step-card">
          <div class="step-card__head">
            <div class="step-num">2</div>
            <div>
              <p class="step-card__title">Müşteri</p>
              <p class="step-card__sub">İletişim ve hesap bilgileri</p>
            </div>
          </div>
          <div class="aord-customer-band">
            <div class="aor-avatar aor-avatar--lg">{{ initials(o.user) }}</div>
            <div class="aord-customer-band__info">
              <p class="aord-customer-band__name">{{ o.user }}</p>
              <p class="aord-customer-band__meta"><i class="pi pi-envelope"></i>{{ o.email }}</p>
              @if (o.phone) {
                <p class="aord-customer-band__meta"><i class="pi pi-phone"></i>{{ o.phone }}</p>
              }
            </div>
          </div>
        </div>

        <!-- STEP 3: Araç Bilgileri -->
        <div class="step-card">
          <div class="step-card__head">
            <div class="step-num">3</div>
            <div>
              <p class="step-card__title">Araç Bilgileri</p>
              <p class="step-card__sub">{{ o.make }} {{ o.model }} · {{ o.year }}</p>
            </div>
          </div>
          <div class="engine-info-strip">
            <div class="engine-info-item">
              <span class="engine-info-k">Marka</span>
              <span class="engine-info-v">{{ o.make || '—' }}</span>
            </div>
            <div class="engine-info-sep"></div>
            <div class="engine-info-item">
              <span class="engine-info-k">Model</span>
              <span class="engine-info-v">{{ o.model || '—' }}</span>
            </div>
            <div class="engine-info-sep"></div>
            <div class="engine-info-item">
              <span class="engine-info-k">Yıl</span>
              <span class="engine-info-v">{{ o.year || '—' }}</span>
            </div>
            <div class="engine-info-sep"></div>
            <div class="engine-info-item">
              <span class="engine-info-k">Motor</span>
              <span class="engine-info-v">{{ o.engine || '—' }}</span>
            </div>
            <div class="engine-info-sep"></div>
            <div class="engine-info-item">
              <span class="engine-info-k">Yakıt</span>
              <span class="fuel-badge fuel-badge--{{ o.fuelType === 'Benzin' ? 'petrol' : o.fuelType === 'Dizel' ? 'diesel' : 'hybrid' }}">{{ o.fuelType }}</span>
            </div>
          </div>
          <div class="aord-detail-row">
            <div class="aord-info-item">
              <span class="aord-info-item__k">Şanzıman</span>
              <span class="aord-info-item__v">{{ o.transmission || '—' }}</span>
            </div>
            <div class="aord-info-item">
              <span class="aord-info-item__k">Kilometre</span>
              <span class="aord-info-item__v">{{ o.km ? o.km + ' km' : '—' }}</span>
            </div>
            <div class="aord-info-item">
              <span class="aord-info-item__k">ECU</span>
              <span class="aord-info-item__v">{{ o.ecu || '—' }}</span>
            </div>
            <div class="aord-info-item">
              <span class="aord-info-item__k">Plaka</span>
              <span class="aord-info-item__v" style="text-transform:uppercase">{{ o.plate || '—' }}</span>
            </div>
            <div class="aord-info-item">
              <span class="aord-info-item__k">VIN / Şasi No</span>
              <span class="aord-vin">{{ o.vin || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- STEP 4: Servis Detayları -->
        <div class="step-card">
          <div class="step-card__head">
            <div class="step-num">4</div>
            <div>
              <p class="step-card__title">Servis Detayları</p>
              <p class="step-card__sub">{{ o.stage }} · {{ o.ecu }} · {{ o.readMethod }} okuma</p>
            </div>
          </div>
          <div class="aord-tune-card aord-tune-card--{{ stageKey(o.stage) }}">
            <div class="aord-tune-card__left">
              <span class="aord-tune-badge aord-tune-badge--{{ stageKey(o.stage) }}">{{ o.stage }}</span>
              <div class="aord-tune-card__info">
                <div class="aord-tune-card__row"><i class="pi pi-microchip"></i>{{ o.ecu }}</div>
                <div class="aord-tune-card__row"><i class="pi pi-database"></i>{{ o.readMethod }} Okuma</div>
              </div>
            </div>
            <div class="aord-tune-card__price">{{ o.basePrice }}</div>
          </div>

          <!-- Okuma & ECU bilgileri -->
          <div class="aord-extras-section">
            <p class="aord-extras-section__label">Okuma & ECU Bilgileri</p>
            <div class="aord-info-grid">
              <div class="aord-info-cell"><span class="aord-info-cell__k">Okuma Aracı</span><span class="aord-info-cell__v">{{ o.readMethod || '—' }}</span></div>
              <div class="aord-info-cell"><span class="aord-info-cell__k">Sanal Dosya</span><span class="aord-info-cell__v">{{ o.virtualFile ? 'Evet' : 'Hayır' }}</span></div>
              <div class="aord-info-cell"><span class="aord-info-cell__k">Dinamometre</span><span class="aord-info-cell__v">{{ o.dyno ? 'Evet' : 'Hayır' }}</span></div>
              <div class="aord-info-cell"><span class="aord-info-cell__k">ECU Donanım No</span><span class="aord-info-cell__v">{{ o.ecuHw || '—' }}</span></div>
              <div class="aord-info-cell"><span class="aord-info-cell__k">ECU Parça No</span><span class="aord-info-cell__v">{{ o.ecuPart || '—' }}</span></div>
              <div class="aord-info-cell"><span class="aord-info-cell__k">ECU Yazılım No</span><span class="aord-info-cell__v">{{ o.ecuSw || '—' }}</span></div>
            </div>
          </div>

          @if (o.extraServices.length > 0) {
            <div class="aord-extras-section">
              <p class="aord-extras-section__label">Ek Servisler</p>
              <div class="aord-extras-section__grid">
                @for (s of o.extraServices; track s) {
                  <div class="aord-mod-tile">
                    <div class="aord-mod-tile__left">
                      <span class="aord-mod-tile__icon"><i class="pi pi-check-circle"></i></span>
                      <div>
                        <p class="aord-mod-tile__name">{{ s }}</p>
                        <p class="aord-mod-tile__desc">{{ extraDesc() }}</p>
                      </div>
                    </div>
                    <span class="aord-mod-tile__price">+{{ extraPrice(s) | number }}₺</span>
                  </div>
                }
              </div>
              <div class="aord-extras-total">
                <span>Ek Servis Toplamı</span>
                <span class="aord-extras-total__val">+{{ extrasTotal() | number }}₺</span>
              </div>
            </div>
          }

          <!-- Genel toplam -->
          <div class="aord-grand-total">
            <span>Toplam Tutar</span>
            <span class="aord-grand-total__val">{{ o.price }}</span>
          </div>

          <!-- Değiştirilmiş parçalar -->
          @if (o.modifiedParts.length > 0) {
            <div class="aord-extras-section">
              <p class="aord-extras-section__label">Değiştirilmiş Parçalar</p>
              <div class="aord-chip-wrap">
                @for (p of o.modifiedParts; track p) {
                  <span class="aord-chip"><i class="pi pi-wrench"></i>{{ p }}</span>
                }
              </div>
            </div>
          }

          <!-- Hata kodları -->
          @if (o.pcodes.length > 0) {
            <div class="aord-extras-section">
              <p class="aord-extras-section__label">Hata Kodları & Notlar</p>
              <div class="aord-pcode-list">
                @for (pc of o.pcodes; track $index) {
                  <div class="aord-pcode-row">
                    @if (pc.pcode) { <span class="aord-pcode-tag"><i class="pi pi-tag"></i>{{ pc.pcode }}</span> }
                    @if (pc.note) { <span class="aord-pcode-note">{{ pc.note }}</span> }
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- STEP 5: Müşteri Notu (conditional) -->
        @if (o.notes) {
          <div class="step-card">
            <div class="step-card__head">
              <div class="step-num step-num--icon"><i class="pi pi-comment"></i></div>
              <div>
                <p class="step-card__title">Müşteri Notu</p>
                <p class="step-card__sub">Siparişe eklenen açıklama</p>
              </div>
            </div>
            <div class="aord-note-block"><i class="pi pi-comment"></i><p>{{ o.notes }}</p></div>
          </div>
        }

        <!-- STEP 6: Orijinal Dosya -->
        <div class="step-card">
          <div class="step-card__head">
            <div class="step-num step-num--icon"><i class="pi pi-file-export"></i></div>
            <div>
              <p class="step-card__title">Müşteri Orijinal Dosyası</p>
              <p class="step-card__sub">{{ o.originalFileUploaded ? o.originalFileName : 'Henüz yüklenmedi' }}</p>
            </div>
          </div>
          @if (o.originalFileUploaded && o.originalFileName) {
            <div class="aor-orig-file">
              <div class="aor-orig-file__icon"><i class="pi pi-file-export"></i></div>
              <div class="aor-orig-file__info">
                <p class="aor-orig-file__name">{{ o.originalFileName }}</p>
                <p class="aor-orig-file__sub">Müşteri tarafından yüklendi</p>
              </div>
              <button class="aor-icon-btn" type="button" title="İndir"
                      [disabled]="downloading(o.dbId, 'original')"
                      (click)="downloadFile(o, 'original')">
                <i class="pi" [class.pi-download]="!downloading(o.dbId, 'original')"
                              [class.pi-spin]="downloading(o.dbId, 'original')"
                              [class.pi-spinner]="downloading(o.dbId, 'original')"></i>
              </button>
            </div>
          } @else {
            <div class="aor-no-file"><i class="pi pi-file-excel"></i><span>Müşteri orijinal dosya yüklemedi.</span></div>
          }
        </div>

      </div>

      <!-- RIGHT -->
      <div class="aor-detail__right">

        <!-- Status change -->
        @if (o.status !== 'cancelled') {
          <div class="aor-dp-card">
            <h2 class="aor-dp-card__title">Sipariş Durumu</h2>
            <div class="aor-status-steps">
              @for (s of statusSteps; track s.key) {
                <button type="button" class="aor-sstep"
                  [class.aor-sstep--active]="o.status === s.key"
                  [class.aor-sstep--done]="statusRank(o.status) > statusRank(s.key)"
                  (click)="setStatus(o, s.key)">
                  <span class="aor-sstep__dot aor-sstep__dot--{{s.key}}"></span>
                  <span>{{ s.label }}</span>
                  @if (statusRank(o.status) > statusRank(s.key)) {
                    <i class="pi pi-check" style="margin-left:auto;font-size:0.7rem;color:#4ade80"></i>
                  }
                </button>
              }
            </div>
            @if (!cancelMode()) {
              <button class="aor-cancel-order-btn" type="button" (click)="openCancelForm()">
                <i class="pi pi-times-circle"></i> Siparişi İptal Et
              </button>
            } @else {
              <div class="aor-note-field" style="margin-top:0.6rem">
                <label class="aor-note-field__lbl" [for]="'aor-cancel-' + o.id">
                  <i class="pi pi-times-circle" style="color:#f87171"></i> İptal Sebebi (müşteriye gösterilir)
                </label>
                <textarea [id]="'aor-cancel-' + o.id" class="aor-note-field__input"
                          rows="3" maxlength="1000"
                          placeholder="Örn. Aracın ECU modeli desteklenmiyor."
                          [value]="cancelReason()"
                          (input)="onCancelReasonChange($event)"></textarea>
              </div>
              <div class="aor-upload-actions">
                <button class="aor-cancel-confirm-btn" type="button" [disabled]="!cancelReason().trim() || cancelSaving()" (click)="confirmCancel(o)">
                  <i class="pi" [class.pi-times-circle]="!cancelSaving()" [class.pi-spin]="cancelSaving()" [class.pi-spinner]="cancelSaving()"></i>
                  {{ cancelSaving() ? 'İptal Ediliyor…' : 'İptali Onayla' }}
                </button>
                <button class="aor-cancel-btn" type="button" (click)="closeCancelForm()">Vazgeç</button>
              </div>
            }
          </div>
        }

        <!-- File upload -->
        <div class="aor-dp-card">
          <h2 class="aor-dp-card__title">Yazılım Dosyası</h2>
          @if (o.status === 'cancelled') {
            <p class="aor-muted" style="font-size:0.8rem;padding:0.25rem 0">İptal edilen sipariş için işlem yapılamaz.</p>
          } @else if (o.fileSent && o.sentFileName && !reuploadMode()) {
            <div class="aor-file-sent">
              <div class="aor-file-sent__icon"><i class="pi pi-file-check"></i></div>
              <div>
                <p class="aor-file-sent__name">{{ o.sentFileName }}</p>
                <p class="aor-file-sent__sub">Müşteriye gönderildi</p>
              </div>
              <button class="aor-icon-btn" type="button" title="İndir"
                      [disabled]="downloading(o.dbId, 'delivered')"
                      (click)="downloadFile(o, 'delivered')">
                <i class="pi" [class.pi-download]="!downloading(o.dbId, 'delivered')"
                              [class.pi-spin]="downloading(o.dbId, 'delivered')"
                              [class.pi-spinner]="downloading(o.dbId, 'delivered')"></i>
              </button>
            </div>
            @if (!noteEditMode()) {
              @if (o.sentFileNote) {
                <div class="aor-file-note">
                  <i class="pi pi-comment"></i>
                  <div>
                    <p class="aor-file-note__lbl">Müşteriye not</p>
                    <p class="aor-file-note__txt">{{ o.sentFileNote }}</p>
                  </div>
                  <button class="aor-file-note__edit" type="button"
                          title="Notu düzenle"
                          (click)="startNoteEdit(o)">
                    <i class="pi pi-pencil"></i>
                  </button>
                </div>
              } @else {
                <button class="aor-add-note-btn" type="button" (click)="startNoteEdit(o)">
                  <i class="pi pi-comment"></i> Not Ekle
                </button>
              }
            } @else {
              <div class="aor-note-field">
                <label class="aor-note-field__lbl" [for]="'aor-note-edit-' + o.id">
                  <i class="pi pi-comment"></i> Müşteriye not
                </label>
                <textarea [id]="'aor-note-edit-' + o.id" class="aor-note-field__input"
                          rows="3" maxlength="1000"
                          [value]="noteEditDraft()"
                          (input)="onNoteEditChange($event)"></textarea>
              </div>
              <div class="aor-upload-actions">
                <button class="aor-send-btn" type="button" [disabled]="noteSaving()" (click)="saveNote(o)">
                  <i class="pi" [class.pi-save]="!noteSaving()" [class.pi-spin]="noteSaving()" [class.pi-spinner]="noteSaving()"></i>
                  {{ noteSaving() ? 'Kaydediliyor…' : 'Notu Kaydet' }}
                </button>
                <button class="aor-cancel-btn" type="button" (click)="cancelNoteEdit()">İptal</button>
              </div>
            }
            <button class="aor-change-btn" type="button" (click)="reuploadMode.set(true)">
              <i class="pi pi-refresh"></i> Dosyayı Değiştir
            </button>
          } @else {
            @if (reuploadMode() && o.sentFileName) {
              <p class="aor-reupload-note"><i class="pi pi-info-circle"></i> Yeni dosya yükleyerek eskisinin üzerine yazabilirsiniz.</p>
            }
            <div class="aor-upload-zone" [class.aor-upload-zone--filled]="selectedFile(o.id)"
              (dragover)="$event.preventDefault()" (drop)="onDrop($event, o.id)">
              @if (!selectedFile(o.id)) {
                <i class="pi pi-cloud-upload"></i>
                <p>Sürükle veya seç</p>
                <label class="aor-upload-btn">
                  <i class="pi pi-folder-open"></i> Dosya Seç
                  <input type="file" accept=".bin,.ori,.hex,.mod" (change)="onFileSelect($event, o.id)" style="display:none" />
                </label>
              } @else {
                <i class="pi pi-file" style="color:#4ade80;font-size:1.3rem"></i>
                <span class="aor-upload-fname">{{ selectedFile(o.id)!.name }}</span>
                <button type="button" class="aor-remove-file" (click)="removeFile(o.id)"><i class="pi pi-times"></i></button>
              }
            </div>
            <div class="aor-note-field">
              <label class="aor-note-field__lbl" [for]="'aor-note-' + o.id">
                <i class="pi pi-comment"></i> Müşteriye not (opsiyonel)
              </label>
              <textarea [id]="'aor-note-' + o.id" class="aor-note-field__input"
                        rows="3" maxlength="1000"
                        placeholder="Örn. Dosya RaceROM ile yazıldı, ilk 500 km'de tam gaz yapmayın…"
                        [value]="noteFor(o.id)"
                        (input)="onNoteChange(o.id, $event)"></textarea>
            </div>
            <div class="aor-upload-actions">
              <button class="aor-send-btn" type="button" [disabled]="!selectedFile(o.id) || sending()" (click)="sendFile(o)">
                <i class="pi" [class.pi-send]="!sending()" [class.pi-spin]="sending()" [class.pi-spinner]="sending()"></i>
                {{ sending() ? 'Gönderiliyor…' : (o.fileSent ? 'Dosyayı Güncelle' : 'Müşteriye Gönder') }}
              </button>
              @if (reuploadMode()) {
                <button class="aor-cancel-btn" type="button" (click)="reuploadMode.set(false); removeFile(o.id)">İptal</button>
              }
            </div>
            <p class="aor-upload-note"><i class="pi pi-info-circle"></i>
              {{ o.fileSent ? 'Yeni dosya gönderildikten sonra müşteri güncel sürümü indirebilir.' : 'Gönderildiğinde sipariş otomatik "Tamamlandı" olur.' }}
            </p>
          }
        </div>

        <!-- Activity log -->
        <div class="aor-dp-card">
          <h2 class="aor-dp-card__title">Aktivite Logu</h2>
          <div class="aor-timeline">
            @for (ev of o.timeline; track $index) {
              <div class="aor-tl-item">
                <div class="aor-tl-item__dot"></div>
                <div class="aor-tl-item__body">
                  <p class="aor-tl-item__event">{{ ev.event }}</p>
                  <p class="aor-tl-item__meta">{{ ev.date }}{{ ev.by ? ' · ' + ev.by : '' }}</p>
                </div>
              </div>
            }
          </div>
        </div>

      </div>
    </div>
  </div>
  }
  }

</div>
}
  `,
  styles: [`
    .aor { display: flex; flex-direction: column; gap: 1.25rem; }
    .aor__title  { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .aor__sub    { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
    .aor__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .aor__actions { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    .aor-muted { color: rgba(255,255,255,0.3); font-size: 0.78rem; }

    .aor-search {
      display: flex; align-items: center; gap: 0.5rem;
      background: #13151c; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0 0.9rem;
      i { color: rgba(255,255,255,0.3); font-size: 0.8rem; }
      input { background: transparent; border: none; color: rgba(255,255,255,0.85); font-size: 0.85rem; padding: 0.6rem 0; width: 220px; outline: none; &::placeholder { color: rgba(255,255,255,0.2); } }
    }
    .aor-filter {
      background: #13151c; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
      padding: 0.6rem 1rem; color: rgba(255,255,255,0.75); font-size: 0.8rem; cursor: pointer; appearance: none; min-width: 140px;
      option { background: #1a1d27; }
    }

    /* Status tabs */
    .aor__status-bar { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .aor-stab {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.85rem; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08); background: #13151c; color: rgba(255,255,255,0.5); font-size: 0.78rem; cursor: pointer; transition: all 160ms;
      &:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.85); }
      &--active { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.2); color: #fff; }
      &__dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
        &--pending    { background: #60a5fa; box-shadow: 0 0 4px #60a5fa88; }
        &--processing { background: #60a5fa; box-shadow: 0 0 4px #60a5fa88; }
        &--completed  { background: #4ade80; }
        &--cancelled  { background: rgba(255,255,255,0.2); }
      }
      &__count { background: rgba(255,255,255,0.08); border-radius: 10px; padding: 0 6px; font-size: 0.68rem; font-weight: 700; }
    }

    /* Table */
    .aor-table-wrap { background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; overflow: auto; }
    .aor-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; min-width: 1320px;
      th { color: rgba(255,255,255,0.3); font-weight: 600; text-transform: uppercase; font-size: 0.65rem; letter-spacing: .05em; padding: 1rem 1.1rem 0.75rem; text-align: left; white-space: nowrap; }
      td { padding: 0.8rem 1.1rem; border-top: 1px solid rgba(255,255,255,0.05); vertical-align: middle; color: rgba(255,255,255,0.8); white-space: nowrap; }
    }
    .aor-row { cursor: pointer; transition: background 140ms; &:hover td { background: rgba(255,255,255,0.025); } }
    .aor-row__id      { font-family: monospace; font-weight: 700; color: #f59e0b; }
    .aor-row__price   { font-weight: 700; color: #fff; }
    .aor-row__vehicle { font-size: 0.84rem; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0 0 4px; }
    .aor-row__ecu     { font-size: 0.78rem; color: rgba(255,255,255,0.6); margin: 0 0 3px; }
    .aor-row__tags    { display: flex; gap: 4px; flex-wrap: wrap; }
    .aor-user-cell { display: flex; align-items: center; gap: 0.65rem;
      &__name  { font-size: 0.85rem; font-weight: 600; color: #fff; margin: 0 0 2px; }
      &__email { font-size: 0.7rem; color: rgba(255,255,255,0.35); margin: 0; }
    }
    .aor-avatar {
      width: 32px; height: 32px; border-radius: 8px; background: rgba(96,165,250,0.12); color: #60a5fa;
      display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; flex-shrink: 0;
      &--lg { width: 44px; height: 44px; border-radius: 12px; font-size: 0.8rem; }
    }
    .aor-icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.4); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; &:hover { background: rgba(255,255,255,0.08); color: #fff; } }
    .aor-empty-td { text-align: center; padding: 3rem !important; color: rgba(255,255,255,0.3); i { font-size: 2rem; display: block; margin-bottom: 0.5rem; } p { margin: 0; font-size: 0.875rem; } }

    /* Shared chips */
    .aor-stage {
      display: inline-flex; padding: 0.12rem 0.45rem; border-radius: 5px; font-size: 0.65rem; font-weight: 700;
      &--s1 { background: rgba(96,165,250,0.12); color: #60a5fa; border: 1px solid rgba(96,165,250,0.25); }
      &--s2 { background: rgba(230,57,70,0.12);  color: #e63946; border: 1px solid rgba(230,57,70,0.25); }
      &--s3 { background: rgba(167,139,250,0.12);color: #a78bfa; border: 1px solid rgba(167,139,250,0.25); }
    }
    .aor-extra-chip {
      display: inline-flex; padding: 0.1rem 0.45rem; border-radius: 5px; font-size: 0.62rem; font-weight: 600;
      background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2);
      &--detail { font-size: 0.72rem; padding: 0.2rem 0.6rem; border-radius: 7px; }
    }
    .aor-method-chip {
      display: inline-flex; padding: 0.1rem 0.45rem; border-radius: 5px; font-size: 0.62rem; font-weight: 600;
      background: rgba(167,139,250,0.1); color: #a78bfa; border: 1px solid rgba(167,139,250,0.2);
    }
    .aor-queue-chip {
      display: inline-flex; align-items: center; gap: 4px;
      margin-left: 0.4rem; padding: 3px 8px; border-radius: 20px;
      font-size: 0.68rem; font-weight: 700;
      background: rgba(168,85,247,0.14); color: #c084fc;
      border: 1px solid rgba(168,85,247,0.3);
      white-space: nowrap;
      i { font-size: 0.7rem; }
      &--lg { font-size: 0.78rem; padding: 6px 12px; gap: 6px; i { font-size: 0.85rem; } }
    }
    .aor-status {
      display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; font-weight: 600;
      &__dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: currentColor; }
      &--pending    { color: #60a5fa; .aor-status__dot { box-shadow: 0 0 5px #60a5fa88; } }
      &--processing { color: #60a5fa; .aor-status__dot { box-shadow: 0 0 5px #60a5fa88; } }
      &--completed  { color: #4ade80; }
      &--cancelled  { color: rgba(255,255,255,0.3); }
    }
    .aor-file-chip {
      display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.18rem 0.55rem; border-radius: 6px; font-size: 0.68rem; font-weight: 600; i { font-size: 0.65rem; }
      &--sent    { background: rgba(74,222,128,0.1);  color: #4ade80; border: 1px solid rgba(74,222,128,0.2);  }
      &--ready   { background: rgba(96,165,250,0.1);  color: #60a5fa; border: 1px solid rgba(96,165,250,0.2);  }
      &--missing { background: rgba(251,191,36,0.08); color: #fbbf24; border: 1px solid rgba(251,191,36,0.15); }
    }

    /* ══ DETAIL ══ */
    .aor-detail { display: flex; flex-direction: column; gap: 1.25rem; animation: fadeIn 220ms ease both; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    .aor-detail__topbar { display: flex; align-items: center; gap: 0.5rem; }
    .aor-back-btn {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.6); font-size: 0.82rem; cursor: pointer; transition: all 160ms;
      &:hover { background: rgba(255,255,255,0.07); color: #fff; } i { font-size: 0.75rem; }
    }
    .aor-breadcrumb { font-size: 0.82rem; color: rgba(255,255,255,0.3); }

    /* Progress stepper */
    .aor-progress {
      display: flex; align-items: flex-start;
      background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 1.25rem 1.75rem;
    }
    .aor-ps {
      display: flex; flex-direction: column; align-items: center; gap: 0.45rem; flex-shrink: 0; min-width: 90px;
      &__circle {
        width: 34px; height: 34px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center;
        color: rgba(255,255,255,0.3); transition: all 280ms;
      }
      &__label { font-size: 0.68rem; color: rgba(255,255,255,0.35); text-align: center; white-space: nowrap; }
      &--done .aor-ps__circle { border-color: #4ade80; background: rgba(74,222,128,0.12); color: #4ade80; }
      &--done .aor-ps__label  { color: rgba(255,255,255,0.55); }
      &--active .aor-ps__circle { border-color: #60a5fa; background: rgba(96,165,250,0.15); color: #60a5fa; box-shadow: 0 0 14px rgba(96,165,250,0.3); }
      &--active .aor-ps__label  { color: #60a5fa; font-weight: 600; }
    }
    .aor-ps-line {
      flex: 1; height: 2px; background: rgba(255,255,255,0.08); min-width: 20px;
      margin-top: 16px; transition: background 280ms;
      &--done { background: rgba(74,222,128,0.4); }
    }
    .aor-cancelled-banner {
      display: flex; align-items: flex-start; gap: 0.65rem; padding: 0.85rem 1.25rem; border-radius: 12px;
      background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2); color: #f87171; font-size: 0.85rem;
      i { font-size: 1.05rem; margin-top: 2px; flex-shrink: 0; }
      > div { min-width: 0; flex: 1; }
    }
    .aor-cancel-confirm-btn {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.65rem; border-radius: 10px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #f87171, #dc2626); color: #fff; font-size: 0.85rem; font-weight: 700;
      &:hover:not(:disabled) { opacity: 0.9; }
      &:disabled { opacity: 0.3; cursor: not-allowed; }
    }

    .aor-detail { width: 100%; min-width: 0; }
    .aor-detail__grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 380px); gap: 1.25rem; align-items: start; width: 100%; @media(max-width:1100px) { grid-template-columns: minmax(0, 1fr); } }
    .aor-detail__left, .aor-detail__right { display: flex; flex-direction: column; gap: 1.1rem; min-width: 0; }

    .aor-dp-card {
      background: #13151c; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 1.25rem;
      &__title { font-size: 0.68rem; font-weight: 700; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: .07em; margin: 0 0 1rem; }
    }

    /* Info grid */
    .aor-ig { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
    .aor-ii {
      display: flex; flex-direction: column; gap: 3px; min-width: 0;
      &--full { grid-column: 1/-1; }
      &__l { font-size: 0.65rem; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: .04em; }
      &__v { font-size: 0.85rem; color: rgba(255,255,255,0.85); font-weight: 500; word-break: break-word; overflow-wrap: anywhere;
        &--price { color: #fff; font-weight: 700; font-size: 1rem; }
        &--id    { font-family: monospace; color: #f59e0b; font-weight: 700; font-size: 1rem; }
        &--mono  { font-family: monospace; font-size: 0.75rem; }
      }
    }

    /* Customer row */
    .aor-customer { display: flex; align-items: center; gap: 0.85rem;
      &__name  { font-size: 0.9rem; font-weight: 600; color: #fff; margin: 0 0 3px; }
      &__email { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin: 0 0 3px; }
      &__phone { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin: 0; display: flex; align-items: center; gap: 0.35rem; i { font-size: 0.65rem; } }
    }

    /* Vehicle head */
    .aor-vehicle-head { display: flex; align-items: center; gap: 0.85rem;
      &__name { font-size: 1rem; font-weight: 700; color: #fff; margin: 0 0 3px; }
      &__sub  { font-size: 0.78rem; color: rgba(255,255,255,0.4); margin: 0; }
    }
    .aor-vehicle-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(230,57,70,0.1); color: #e63946; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; }

    /* Extras */
    .aor-extras { margin-top: 0.85rem; display: flex; flex-direction: column; gap: 0.45rem; }
    .aor-extras__row { display: flex; gap: 0.4rem; flex-wrap: wrap; }

    /* Notes */
    .aor-note-block { display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.75rem; border-radius: 10px; background: rgba(255,255,255,0.03); font-size: 0.82rem; color: rgba(255,255,255,0.6); i { color: #f59e0b; flex-shrink: 0; margin-top: 1px; } p { margin: 0; } }

    /* Orig file */
    .aor-orig-file { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: 12px; background: rgba(96,165,250,0.05); border: 1px solid rgba(96,165,250,0.15);
      &__icon { width: 38px; height: 38px; border-radius: 10px; background: rgba(96,165,250,0.12); color: #60a5fa; display: flex; align-items: center; justify-content: center; flex-shrink: 0; i { font-size: 1rem; } }
      &__info { flex: 1; min-width: 0; }
      &__name { font-size: 0.82rem; font-weight: 600; color: #fff; margin: 0 0 2px; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      &__sub  { font-size: 0.7rem; color: rgba(96,165,250,0.6); margin: 0; }
    }
    .aor-no-file { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: rgba(255,255,255,0.25); i { font-size: 1rem; } }

    /* Status steps */
    .aor-status-steps { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
    .aor-sstep {
      display: flex; align-items: center; gap: 0.65rem; padding: 0.65rem 0.9rem; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.07); background: transparent; color: rgba(255,255,255,0.4); font-size: 0.82rem; cursor: pointer; text-align: left; transition: all 160ms; width: 100%;
      &:hover  { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.03); }
      &--active { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.2); color: #fff; font-weight: 600; }
      &--done   { color: rgba(255,255,255,0.3); &:hover { border-color: rgba(255,255,255,0.07); color: rgba(255,255,255,0.3); background: transparent; } }
      &__dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        &--pending    { background: #60a5fa; box-shadow: 0 0 5px #60a5fa66; }
        &--processing { background: #60a5fa; box-shadow: 0 0 5px #60a5fa66; }
        &--completed  { background: #4ade80; }
      }
    }
    .aor-cancel-order-btn { display: flex; align-items: center; justify-content: center; gap: 0.4rem; width: 100%; padding: 0.55rem; border-radius: 9px; border: 1px dashed rgba(248,113,113,0.25); background: transparent; color: rgba(248,113,113,0.5); font-size: 0.78rem; cursor: pointer; &:hover { border-color: rgba(248,113,113,0.5); color: #f87171; background: rgba(248,113,113,0.06); } i { font-size: 0.78rem; } }

    /* File upload */
    .aor-file-sent {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem; border-radius: 12px;
      background: rgba(74,222,128,0.07); border: 1px solid rgba(74,222,128,0.2); margin-bottom: 0.65rem;
      &__icon { width: 38px; height: 38px; border-radius: 10px; background: rgba(74,222,128,0.15); color: #4ade80; display: flex; align-items: center; justify-content: center; flex-shrink: 0; i { font-size: 1.1rem; } }
      &__name { font-size: 0.82rem; font-weight: 600; color: #fff; margin: 0 0 2px; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      &__sub  { font-size: 0.7rem; color: rgba(74,222,128,0.7); margin: 0; }
    }
    .aor-change-btn { display: flex; align-items: center; justify-content: center; gap: 0.4rem; width: 100%; padding: 0.55rem; border-radius: 9px; border: 1px dashed rgba(255,255,255,0.12); background: transparent; color: rgba(255,255,255,0.4); font-size: 0.78rem; cursor: pointer; &:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.8); } i { font-size: 0.78rem; } }
    .aor-reupload-note { font-size: 0.75rem; color: rgba(251,191,36,0.7); margin: 0 0 0.65rem; display: flex; align-items: flex-start; gap: 0.4rem; i { flex-shrink: 0; } }
    .aor-upload-zone {
      border: 2px dashed rgba(255,255,255,0.1); border-radius: 12px; background: rgba(255,255,255,0.02);
      display: flex; flex-direction: column; align-items: center; gap: 0.45rem; padding: 1.4rem; text-align: center; margin-bottom: 0.65rem;
      i { font-size: 1.75rem; color: rgba(255,255,255,0.2); }
      p { font-size: 0.78rem; color: rgba(255,255,255,0.3); margin: 0; }
      &--filled { flex-direction: row; padding: 0.7rem 1rem; border-color: rgba(74,222,128,0.3); background: rgba(74,222,128,0.03); }
    }
    .aor-upload-btn { display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 0.4rem 0.85rem; font-size: 0.75rem; color: rgba(255,255,255,0.7); &:hover { background: rgba(255,255,255,0.12); } }
    .aor-upload-fname { flex: 1; font-size: 0.8rem; color: rgba(255,255,255,0.8); text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .aor-remove-file  { border: none; background: transparent; color: rgba(255,255,255,0.3); cursor: pointer; flex-shrink: 0; &:hover { color: #fff; } }
    .aor-upload-actions { display: flex; gap: 0.6rem; margin-bottom: 0.6rem; }
    .aor-send-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.65rem; border-radius: 10px; border: none; cursor: pointer; background: linear-gradient(135deg,#4ade80,#16a34a); color: #000; font-size: 0.85rem; font-weight: 700; &:hover:not(:disabled) { opacity: 0.9; } &:disabled { opacity: 0.3; cursor: not-allowed; } }
    .aor-cancel-btn { padding: 0.65rem 1rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.5); font-size: 0.8rem; cursor: pointer; &:hover { background: rgba(255,255,255,0.06); color: #fff; } }
    .aor-upload-note { font-size: 0.72rem; color: rgba(255,255,255,0.3); margin: 0; display: flex; align-items: flex-start; gap: 0.4rem; i { flex-shrink: 0; color: rgba(245,158,11,0.5); } }
    .aor-note-field { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.6rem; }
    .aor-note-field__lbl { font-size: 0.78rem; color: rgba(255,255,255,0.55); display: inline-flex; align-items: center; gap: 0.4rem; i { color: #60a5fa; } }
    .aor-note-field__input {
      width: 100%; resize: vertical; min-height: 64px; padding: 0.6rem 0.75rem;
      border-radius: 10px; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08); color: #fff;
      font: inherit; font-size: 0.82rem; line-height: 1.4;
      &::placeholder { color: rgba(255,255,255,0.25); }
      &:focus { outline: none; border-color: rgba(96,165,250,0.5); background: rgba(255,255,255,0.06); }
    }
    .aor-file-note { display: flex; gap: 0.6rem; padding: 0.7rem 0.85rem; border-radius: 10px; background: rgba(96,165,250,0.08); border: 1px solid rgba(96,165,250,0.2); margin: 0.5rem 0 0.6rem; }
    .aor-file-note i { color: #60a5fa; font-size: 0.95rem; margin-top: 2px; }
    .aor-file-note__lbl { margin: 0 0 0.2rem; font-size: 0.72rem; font-weight: 600; color: rgba(96,165,250,0.9); text-transform: uppercase; letter-spacing: 0.04em; }
    .aor-file-note__txt { margin: 0; font-size: 0.83rem; color: rgba(255,255,255,0.85); line-height: 1.45; white-space: pre-wrap; }
    .aor-file-note__edit { background: transparent; border: 1px solid rgba(96,165,250,0.3); color: #93c5fd; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; align-self: flex-start; &:hover { background: rgba(96,165,250,0.15); } i { font-size: 0.78rem; } }
    .aor-add-note-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem; border-radius: 10px; cursor: pointer; background: rgba(96,165,250,0.08); border: 1px dashed rgba(96,165,250,0.3); color: #93c5fd; font-size: 0.82rem; font-weight: 600; margin: 0.5rem 0 0.6rem; &:hover { background: rgba(96,165,250,0.14); } }

    /* Timeline */
    .aor-timeline { display: flex; flex-direction: column; gap: 0; }
    .aor-tl-item {
      display: flex; gap: 0.75rem; position: relative; padding-bottom: 0.85rem;
      &:last-child { padding-bottom: 0; }
      &::before { content: ''; position: absolute; left: 6px; top: 14px; bottom: 0; width: 1px; background: rgba(255,255,255,0.08); }
      &:last-child::before { display: none; }
      &__dot { width: 13px; height: 13px; border-radius: 50%; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); flex-shrink: 0; margin-top: 2px; }
      &__body { flex: 1; }
      &__event { font-size: 0.8rem; color: rgba(255,255,255,0.75); margin: 0 0 2px; font-weight: 500; }
      &__meta  { font-size: 0.68rem; color: rgba(255,255,255,0.3); margin: 0; }
    }

    /* ══ STEP-CARD DESIGN SYSTEM ══ */
    .step-card {
      background: #1a1d27; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 1.75rem;
      display: flex; flex-direction: column; gap: 1.25rem;
      &__head { display: flex; align-items: flex-start; gap: 1rem; }
      &__title { font-size: 1rem; font-weight: 700; color: #fff; margin: 0 0 3px; }
      &__sub   { font-size: 0.78rem; color: rgba(255,255,255,0.35); margin: 0; }
    }
    .step-num {
      width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
      background: linear-gradient(135deg, #e63946, #c1121f);
      font-size: 0.85rem; font-weight: 800; color: #fff;
      display: flex; align-items: center; justify-content: center;
      &--icon { font-size: 0.75rem; }
    }

    /* Engine info strip */
    .engine-info-strip {
      display: flex; flex-wrap: wrap;
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; overflow: hidden;
    }
    .engine-info-item {
      flex: 1; min-width: 100px; display: flex; flex-direction: column; gap: 4px; padding: 0.875rem 1.1rem;
    }
    .engine-info-sep { width: 1px; align-self: stretch; background: rgba(255,255,255,0.06); flex-shrink: 0; }
    .engine-info-k { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.3); }
    .engine-info-v { font-size: 0.82rem; font-weight: 700; color: rgba(255,255,255,0.85); }

    /* Fuel badge */
    .fuel-badge {
      display: inline-flex; align-items: center; padding: 0.15rem 0.5rem; border-radius: 6px; font-size: 0.72rem; font-weight: 700; width: fit-content;
      &--petrol { background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.25); }
      &--diesel  { background: rgba(96,165,250,0.12); color: #60a5fa; border: 1px solid rgba(96,165,250,0.25); }
      &--hybrid  { background: rgba(74,222,128,0.12); color: #4ade80; border: 1px solid rgba(74,222,128,0.25); }
    }

    /* Detail info items */
    .aord-info-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.85rem; }
    .aord-detail-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
    .aord-detail-row .aord-info-item {
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px; padding: 0.75rem 1rem;
    }
    .aord-info-item {
      display: flex; flex-direction: column; gap: 4px;
      &__k { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(255,255,255,0.3); }
      &__v { font-size: 0.88rem; font-weight: 600; color: rgba(255,255,255,0.85);
        &--id    { font-family: monospace; color: #f59e0b; font-weight: 700; font-size: 1rem; }
        &--price { color: #fff; font-weight: 800; font-size: 1.1rem; }
      }
    }
    .aord-vin-row { display: flex; flex-direction: column; gap: 5px; }
    .aord-vin { font-family: monospace; font-size: 0.82rem; font-weight: 700; color: #e63946; letter-spacing: 0.03em; overflow-wrap: anywhere; word-break: break-all; }

    /* Customer band */
    .aord-customer-band {
      display: flex; align-items: center; gap: 1rem;
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 1rem 1.25rem;
      &__info { display: flex; flex-direction: column; gap: 4px; }
      &__name { font-size: 0.95rem; font-weight: 700; color: #fff; margin: 0; }
      &__meta { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin: 0; display: flex; align-items: center; gap: 0.4rem; i { font-size: 0.65rem; } }
    }

    /* Tune card */
    .aord-tune-card {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem; border-radius: 14px; border: 1px solid;
      &--s1 { background: rgba(96,165,250,0.05);  border-color: rgba(96,165,250,0.2); }
      &--s2 { background: rgba(230,57,70,0.05);   border-color: rgba(230,57,70,0.2); }
      &--s3 { background: rgba(167,139,250,0.05); border-color: rgba(167,139,250,0.2); }
      &__left { display: flex; align-items: center; gap: 0.85rem; }
      &__info { display: flex; flex-direction: column; gap: 5px; }
      &__row  { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: rgba(255,255,255,0.6); i { font-size: 0.7rem; } }
      &__price { font-size: 1.05rem; font-weight: 800; color: #fff; flex-shrink: 0; }
    }
    .aord-tune-badge {
      display: inline-flex; align-items: center; padding: 0.25rem 0.65rem; border-radius: 8px; font-size: 0.72rem; font-weight: 800; flex-shrink: 0;
      &--s1 { background: rgba(96,165,250,0.15);  color: #60a5fa; border: 1px solid rgba(96,165,250,0.3); }
      &--s2 { background: rgba(230,57,70,0.15);   color: #e63946; border: 1px solid rgba(230,57,70,0.3); }
      &--s3 { background: rgba(167,139,250,0.15); color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); }
    }

    /* Extra services module tiles */
    .aord-extras-section { display: flex; flex-direction: column; gap: 0.65rem;
      &__label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: rgba(255,255,255,0.3); margin: 0; }
      &__grid  { display: flex; flex-direction: column; gap: 0.4rem; }
    }
    .aord-mod-tile {
      display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
      padding: 0.7rem 1rem; border-radius: 11px;
      background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.15);
      transition: border-color 160ms;
      &:hover { border-color: rgba(245,158,11,0.3); }
      &__left  { display: flex; align-items: center; gap: 0.65rem; flex: 1; min-width: 0; }
      &__icon  { width: 28px; height: 28px; border-radius: 8px; background: rgba(245,158,11,0.12); color: #f59e0b; display: flex; align-items: center; justify-content: center; flex-shrink: 0; i { font-size: 0.75rem; } }
      &__name  { font-size: 0.8rem; font-weight: 700; color: #fff; margin: 0 0 2px; }
      &__desc  { font-size: 0.68rem; color: rgba(255,255,255,0.35); margin: 0; }
      &__price { font-size: 0.82rem; font-weight: 800; color: #f59e0b; flex-shrink: 0; white-space: nowrap; }
    }
    .aord-extras-total {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.55rem 1rem; border-radius: 10px;
      background: rgba(245,158,11,0.08); border: 1px dashed rgba(245,158,11,0.25);
      font-size: 0.72rem; color: rgba(255,255,255,0.4); font-weight: 600;
      &__val { font-size: 0.88rem; font-weight: 800; color: #f59e0b; }
    }
    .aord-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
    @media (max-width: 640px) { .aord-info-grid { grid-template-columns: repeat(2, 1fr); } }
    .aord-info-cell {
      display: flex; flex-direction: column; gap: 3px;
      padding: 0.55rem 0.75rem; border-radius: 10px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
      &__k { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.35); font-weight: 700; }
      &__v { font-size: 0.82rem; color: #fff; font-weight: 600; word-break: break-word; }
    }
    .aord-grand-total {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 1rem; padding: 0.7rem 1rem; border-radius: 10px;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
      font-size: 0.8rem; color: rgba(255,255,255,0.6); font-weight: 700;
      &__val { font-size: 1.05rem; font-weight: 800; color: #fff; }
    }
    .aord-chip-wrap { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .aord-chip {
      display: inline-flex; align-items: center; gap: 0.35rem;
      font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.75);
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      padding: 4px 10px; border-radius: 20px;
      i { font-size: 0.7rem; color: #60a5fa; }
    }
    .aord-pcode-list { display: flex; flex-direction: column; gap: 0.4rem; }
    .aord-pcode-row {
      display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;
      padding: 0.5rem 0.75rem; border-radius: 10px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
    }
    .aord-pcode-tag {
      display: inline-flex; align-items: center; gap: 0.3rem; flex-shrink: 0;
      font-family: 'Courier New', monospace; font-size: 0.75rem; font-weight: 800;
      color: #e63946; background: rgba(230,57,70,0.12); padding: 2px 8px; border-radius: 6px;
      i { font-size: 0.65rem; }
    }
    .aord-pcode-note { font-size: 0.78rem; color: rgba(255,255,255,0.6); }

    /* Note block */
    .aord-note-block {
      display: flex; align-items: flex-start; gap: 0.65rem; padding: 0.9rem 1rem; border-radius: 12px;
      background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.15);
      font-size: 0.84rem; color: rgba(255,255,255,0.7);
      i { color: #f59e0b; flex-shrink: 0; margin-top: 1px; }
      p { margin: 0; }
    }
  `],
})
export class AdminOrdersPage implements OnInit {
  private readonly ordersApi = inject(OrdersService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly orders        = signal<AdminOrder[]>([]);
  protected readonly loading       = signal(true);
  protected readonly loadError     = signal('');

  ngOnInit(): void {
    const cached = this.ordersApi.peekAdminOrders();
    if (cached) { this.orders.set(cached.map(mapAdminOrder)); this.loading.set(false); }

    this.ordersApi.adminListOrders()
      .then(data => { this.orders.set(data.map(mapAdminOrder)); this.loadError.set(''); })
      .catch(() => { if (!cached) { this.loadError.set('Siparişler yüklenemedi.'); } })
      .finally(() => { this.loading.set(false); this.cdr.markForCheck(); });
  }

  protected readonly files         = signal<Record<string, File | null>>({});
  protected readonly fileNotes     = signal<Record<string, string>>({});
  protected readonly noteEditMode  = signal(false);
  protected readonly noteEditDraft = signal('');
  protected readonly noteSaving    = signal(false);
  noteFor(id: string): string { return this.fileNotes()[id] ?? ''; }
  onNoteChange(orderId: string, ev: Event): void {
    const val = (ev.target as HTMLTextAreaElement).value;
    this.fileNotes.update(m => ({ ...m, [orderId]: val }));
  }
  startNoteEdit(o: AdminOrder): void {
    this.noteEditDraft.set(o.sentFileNote ?? '');
    this.noteEditMode.set(true);
  }
  onNoteEditChange(ev: Event): void {
    this.noteEditDraft.set((ev.target as HTMLTextAreaElement).value);
  }
  cancelNoteEdit(): void {
    this.noteEditMode.set(false);
    this.noteEditDraft.set('');
  }
  async saveNote(o: AdminOrder): Promise<void> {
    if (this.noteSaving()) { return; }
    this.noteSaving.set(true);
    try {
      const updated = mapAdminOrder(await this.ordersApi.adminUpdateDeliveredNote(o.dbId, this.noteEditDraft()));
      this.orders.update(list => list.map(x => x.dbId === updated.dbId ? updated : x));
      this.selectedOrder.update(sel => sel?.dbId === updated.dbId ? updated : sel);
      this.cancelNoteEdit();
    } catch {
      this.loadError.set('Not güncellenemedi.');
    } finally {
      this.noteSaving.set(false);
      this.cdr.markForCheck();
    }
  }
  protected readonly search        = signal('');
  protected readonly filterStatus  = signal<OrderStatus | ''>('');
  protected readonly currentView   = signal<'list' | 'detail'>('list');
  protected readonly selectedOrder = signal<AdminOrder | null>(null);
  protected readonly reuploadMode  = signal(false);

  protected readonly statusTabs = [
    { key: 'pending'    as OrderStatus, label: 'Hazırlanıyor' },
    { key: 'completed'  as OrderStatus, label: 'Tamamlandı'   },
    { key: 'cancelled'  as OrderStatus, label: 'İptal'        },
  ];
  protected readonly statusSteps = [
    { key: 'pending'    as OrderStatus, label: 'Hazırlanıyor' },
    { key: 'completed'  as OrderStatus, label: 'Tamamlandı'   },
  ];
  protected readonly progressSteps = [
    { label: 'Sipariş Alındı', icon: 'pi-check-circle', rank: 0 },
    { label: 'Hazırlanıyor',   icon: 'pi-cog',           rank: 1 },
    { label: 'Tamamlandı',     icon: 'pi-check',         rank: 2 },
  ];

  protected readonly filtered = computed(() => {
    let list = this.orders();
    const q = this.search().toLowerCase();
    if (q) { list = list.filter(o => o.id.toLowerCase().includes(q) || o.user.toLowerCase().includes(q) || `${o.make} ${o.model}`.toLowerCase().includes(q)); }
    const s = this.filterStatus();
    if (s === 'pending') {
      // "Hazırlanıyor" filtresi geriye dönük uyumluluk için processing'i de kapsar.
      list = list.filter(o => o.status === 'pending' || o.status === 'processing');
    } else if (s) {
      list = list.filter(o => o.status === s);
    }
    return list;
  });

  /* ─── Sayfalama (10/sayfa) ─── */
  protected readonly pageSize = 10;
  protected readonly page     = signal(1);
  protected readonly paged    = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });
  private readonly _resetPage = effect(() => {
    this.search(); this.filterStatus();
    this.page.set(1);
  });

  extraDesc(): string { return ''; }
  extraPrice(name: string): number { return this.selectedOrder()?.priceMap[name] ?? 0; }
  extrasTotal(): number { return this.selectedOrder()?.extrasTotalValue ?? 0; }

  statusLabel(s: OrderStatus): string { return STATUS_LABEL[s]; }
  countByStatus(s: OrderStatus): number {
    if (s === 'pending') {
      return this.orders().filter(o => o.status === 'pending' || o.status === 'processing').length;
    }
    return this.orders().filter(o => o.status === s).length;
  }
  initials(name: string): string { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
  stageKey(stage: string): string { return stage === 'Stage 1' ? 's1' : stage === 'Stage 2' ? 's2' : 's3'; }
  selectedFile(id: string): File | null { return this.files()[id] ?? null; }
  statusRank(s: OrderStatus): number { return { pending: 0, processing: 0, completed: 1, cancelled: -1 }[s]; }
  progressRank(s: OrderStatus): number { return { pending: 1, processing: 1, completed: 3, cancelled: 0 }[s]; }

  openDetail(o: AdminOrder): void { this.selectedOrder.set(o); this.reuploadMode.set(false); this.cancelNoteEdit(); this.closeCancelForm(); this.currentView.set('detail'); }
  goBack(): void { this.currentView.set('list'); this.selectedOrder.set(null); }

  async setStatus(o: AdminOrder, status: OrderStatus): Promise<void> {
    if (o.status === status) { return; }
    const prev = o.status;
    // Optimistik: durumu anında değiştir, ağ arka planda senkronize etsin.
    this.applyStatus(o.dbId, status);
    try {
      const updated = mapAdminOrder(await this.ordersApi.adminUpdateStatus(o.dbId, status));
      this.orders.update(list => list.map(x => x.dbId === updated.dbId ? updated : x));
      this.selectedOrder.update(sel => sel?.dbId === updated.dbId ? updated : sel);
    } catch {
      this.applyStatus(o.dbId, prev); // başarısızsa geri al
      this.loadError.set('Durum güncellenemedi.');
    } finally {
      this.cdr.markForCheck();
    }
  }

  /** Bir siparişin durumunu hem listede hem seçili kayıtta günceller (yerel). */
  private applyStatus(dbId: string, status: OrderStatus): void {
    this.orders.update(list => list.map(x => x.dbId === dbId ? { ...x, status } : x));
    this.selectedOrder.update(sel => sel?.dbId === dbId ? { ...sel, status } : sel);
  }

  protected readonly cancelMode    = signal(false);
  protected readonly cancelReason  = signal('');
  protected readonly cancelSaving  = signal(false);
  openCancelForm(): void { this.cancelMode.set(true); this.cancelReason.set(''); }
  closeCancelForm(): void { this.cancelMode.set(false); this.cancelReason.set(''); }
  onCancelReasonChange(ev: Event): void {
    this.cancelReason.set((ev.target as HTMLTextAreaElement).value);
  }
  async confirmCancel(o: AdminOrder): Promise<void> {
    const reason = this.cancelReason().trim();
    if (!reason || this.cancelSaving()) { return; }
    const prev = o.status;
    // Optimistik: anında iptal göster.
    this.orders.update(list => list.map(x => x.dbId === o.dbId ? { ...x, status: 'cancelled', cancellationReason: reason } : x));
    this.selectedOrder.update(sel => sel?.dbId === o.dbId ? { ...sel, status: 'cancelled', cancellationReason: reason } : sel);
    this.closeCancelForm();
    this.cancelSaving.set(true);
    try {
      const updated = mapAdminOrder(await this.ordersApi.adminUpdateStatus(o.dbId, 'cancelled', reason));
      this.orders.update(list => list.map(x => x.dbId === updated.dbId ? updated : x));
      this.selectedOrder.update(sel => sel?.dbId === updated.dbId ? updated : sel);
    } catch {
      this.applyStatus(o.dbId, prev); // geri al
      this.loadError.set('Sipariş iptal edilemedi.');
    } finally {
      this.cancelSaving.set(false);
      this.cdr.markForCheck();
    }
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

  protected readonly sending = signal(false);
  protected readonly downloadingKey = signal<string | null>(null);
  protected downloading(id?: string, kind?: 'original' | 'delivered'): boolean {
    const cur = this.downloadingKey();
    if (!cur) { return false; }
    if (!id) { return true; }
    return cur === `${id}:${kind ?? 'delivered'}`;
  }

  async downloadFile(o: AdminOrder, kind: 'original' | 'delivered'): Promise<void> {
    if (this.downloadingKey()) { return; }
    this.downloadingKey.set(`${o.dbId}:${kind}`);
    try {
      const res = await this.ordersApi.getDownloadUrl(o.dbId, kind);
      await triggerDownload(res.url, res.fileName);
    } catch {
      this.loadError.set('Dosya indirilemedi.');
    } finally {
      this.downloadingKey.set(null);
      this.cdr.markForCheck();
    }
  }

  async sendFile(o: AdminOrder): Promise<void> {
    const file = this.files()[o.id];
    if (!file || this.sending()) { return; }
    this.sending.set(true);
    try {
      const note = this.fileNotes()[o.id];
      const updated = mapAdminOrder(await this.ordersApi.adminDeliverFile(o.dbId, file, note));
      this.orders.update(list => list.map(x => x.dbId === updated.dbId ? updated : x));
      this.selectedOrder.update(sel => sel?.dbId === updated.dbId ? updated : sel);
      this.files.update(m => ({ ...m, [o.id]: null }));
      this.fileNotes.update(m => ({ ...m, [o.id]: '' }));
      this.reuploadMode.set(false);
    } catch {
      this.loadError.set('Dosya gönderilemedi.');
    } finally {
      this.sending.set(false);
      this.cdr.markForCheck();
    }
  }
}
