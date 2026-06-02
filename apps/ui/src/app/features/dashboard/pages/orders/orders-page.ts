import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, effect, inject, signal, computed } from '@angular/core';
import { PageLoader } from '../../../../shared/page-loader';
import { Paginator } from '../../../../shared/paginator';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Order, OrdersService } from '../../../../core/orders/orders.service';
import { fuelLabelTr, stageLabel, formatTrDateTime, formatTl, triggerDownload } from '../../../../core/orders/order-format';

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

interface UserOrder {
  id: string; dbId: string; date: string;
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
  fileAvailable: boolean; fileName?: string; fileNote?: string | null;
  priceMap: Record<string, number>;
  extrasTotalValue: number;
  queuePosition: number | null;
  queueTotal: number;
  cancellationReason: string | null;
}

/** API Order → ekran modeli (UserOrder). */
function mapOrder(o: Order): UserOrder {
  const items = o.items ?? [];
  const original = o.files.find(f => f.kind === 'original');
  const delivered = o.files.find(f => f.kind === 'delivered');
  return {
    id: o.orderNo,
    dbId: o.id,
    date: formatTrDateTime(o.createdAt),
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
    fileAvailable: !!delivered && delivered.isDownloadable,
    fileName: delivered?.fileName,
    fileNote: delivered?.notes ?? null,
    priceMap: Object.fromEntries(items.map(i => [i.label, i.unitPrice])),
    extrasTotalValue: o.extrasTotal,
    queuePosition: o.queuePosition,
    queueTotal: o.queueTotal,
    cancellationReason: o.cancellationReason ?? null,
  };
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Hazırlanıyor', processing: 'Hazırlanıyor', completed: 'Tamamlandı', cancelled: 'İptal'
};

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [FormsModule, DecimalPipe, PageLoader, Paginator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
@if (loading()) { <app-page-loader /> } @else {
<div class="op">

  @if (currentView() === 'list') {
  <!-- ══ LIST ══ -->
  <div class="op__header">
    <div>
      <h1 class="op__title">Siparişlerim</h1>
      <p class="op__sub">Chip tuning siparişleriniz</p>
    </div>
    <div class="op__summary">
      <div class="op__si"><span class="op__sv">{{ orders().length }}</span><span class="op__sl">Toplam</span></div>
      <div class="op__ss"></div>
      <div class="op__si op__si--green"><span class="op__sv">{{ countBy('completed') }}</span><span class="op__sl">Tamamlandı</span></div>
      <div class="op__ss"></div>
      <div class="op__si op__si--blue"><span class="op__sv">{{ countBy('pending') }}</span><span class="op__sl">Hazırlanıyor</span></div>
      <div class="op__ss"></div>
      <div class="op__si op__si--red"><span class="op__sv">{{ countBy('cancelled') }}</span><span class="op__sl">İptal</span></div>
    </div>
  </div>

  <div class="op__filters">
    <div class="op__search">
      <i class="pi pi-search"></i>
      <input type="text" placeholder="Sipariş veya araç ara…"
        [ngModel]="search()" (ngModelChange)="search.set($event)" />
    </div>
    <div class="op__chips">
      @for (f of filterOptions; track f.value) {
        <button class="op__chip" [class.op__chip--active]="activeFilter() === f.value"
          type="button" (click)="activeFilter.set(f.value)">{{ f.label }}</button>
      }
    </div>
  </div>

  <div class="op__table-wrap">
    <table class="op__table">
      <thead><tr>
        <th>Araç</th><th>Yıl</th><th>Motor</th><th>ECU</th><th>Şanzıman</th><th>Plaka</th>
        <th>Servis</th><th>Tarih</th><th>Tutar</th><th>Durum</th><th>Dosya</th><th></th>
      </tr></thead>
      <tbody>
        @if (filtered().length === 0) {
          <tr><td colspan="12" class="op__empty"><i class="pi pi-inbox"></i><span>Sipariş bulunamadı</span></td></tr>
        }
        @for (o of paged(); track o.id) {
          <tr class="op__row" (click)="openDetail(o)">
            <td>
              <div class="op__veh">
                <div class="op__veh-icon"><i class="pi pi-car"></i></div>
                <div>
                  <p class="op__veh-name">{{ o.make }} {{ o.model }}</p>
                  <p class="op__veh-id">{{ o.id }}</p>
                </div>
              </div>
            </td>
            <td class="op__muted">{{ o.year || '—' }}</td>
            <td class="op__muted">{{ o.engine || '—' }}</td>
            <td class="op__muted">{{ o.ecu || '—' }}</td>
            <td class="op__muted">{{ o.transmission || '—' }}</td>
            <td class="op__muted" style="text-transform:uppercase">{{ o.plate || '—' }}</td>
            <td>
              <div class="op__svc">
                <span class="s-chip s-chip--{{ stageKey(o.stage) }}">{{ o.stage }}</span>
                @for (ex of o.extraServices.slice(0, 2); track ex) {
                  <span class="op__svc-chip">{{ ex }}</span>
                }
                @if (o.extraServices.length > 2) {
                  <span class="op__svc-chip">+{{ o.extraServices.length - 2 }}</span>
                }
              </div>
            </td>
            <td class="op__muted">{{ o.date }}</td>
            <td class="op__price">{{ o.price }}</td>
            <td>
              <span class="st-chip st-chip--{{o.status}}"><span class="st-dot"></span>{{ statusLabel(o.status) }}</span>
              @if (o.queuePosition) {
                <span class="op__queue" title="Kuyruk sıranız">
                  <i class="pi pi-sort-numeric-down"></i> {{ o.queuePosition }}. sırada
                </span>
              }
            </td>
            <td>
              @if (o.fileAvailable) {
                <button class="op__btn op__btn--dl" title="İndir" type="button"
                        [disabled]="downloading(o.dbId)"
                        (click)="$event.stopPropagation(); download(o)">
                  <i class="pi" [class.pi-download]="!downloading(o.dbId)"
                                [class.pi-spin]="downloading(o.dbId)"
                                [class.pi-spinner]="downloading(o.dbId)"></i>
                </button>
              } @else {
                <button class="op__btn op__btn--off" disabled><i class="pi pi-clock"></i></button>
              }
            </td>
            <td>
              <button class="op__btn" type="button" (click)="$event.stopPropagation(); openDetail(o)">
                <i class="pi pi-chevron-right"></i>
              </button>
            </td>
          </tr>
        }
      </tbody>
    </table>
  </div>
  <app-paginator [total]="filtered().length" [(page)]="page" [pageSize]="pageSize" />

  } @else {
  <!-- ══ DETAIL ══ -->
  @if (selectedOrder(); as o) {
  <div class="od">

    <!-- Topbar -->
    <div class="od__topbar">
      <button class="od__back" type="button" (click)="goBack()">
        <i class="pi pi-arrow-left"></i> Siparişlerim
      </button>
      <span class="od__bc">/ {{ o.id }}</span>
      <div class="od__topbar-right">
        <span class="st-chip st-chip--{{o.status}}"><span class="st-dot"></span>{{ statusLabel(o.status) }}</span>
        <span class="od__price-hero">{{ o.price }}</span>
      </div>
    </div>

    <!-- Progress stepper -->
    @if (o.status !== 'cancelled') {
      <div class="od__progress">
        @for (step of progressSteps; track step.rank; let last = $last) {
          <div class="od-ps"
            [class.od-ps--done]="progressRank(o.status) > step.rank"
            [class.od-ps--active]="progressRank(o.status) === step.rank">
            <div class="od-ps__circle">
              @if (progressRank(o.status) > step.rank) {
                <i class="pi pi-check"></i>
              } @else {
                <i [class]="'pi ' + step.icon"></i>
              }
            </div>
            <div class="od-ps__text">
              <span class="od-ps__label">{{ step.label }}</span>
              @if (progressRank(o.status) === step.rank && step.hint) {
                <span class="od-ps__hint">{{ step.hint }}</span>
              }
            </div>
          </div>
          @if (!last) {
            <div class="od-ps__line" [class.od-ps__line--done]="progressRank(o.status) > step.rank"></div>
          }
        }
      </div>
    } @else {
      <div class="od__cancelled">
        <i class="pi pi-times-circle"></i>
        <div>
          <p style="margin:0;font-weight:600">Bu sipariş iptal edilmiştir.</p>
          @if (o.cancellationReason) {
            <p style="margin:0.25rem 0 0;font-size:0.82rem;color:rgba(255,255,255,0.7);white-space:pre-wrap">
              <strong style="color:#f87171">Sebep:</strong> {{ o.cancellationReason }}
            </p>
          }
        </div>
      </div>
    }

    <!-- Checkout layout -->
    <div class="od__layout">

      <!-- STEPS (left) -->
      <div class="od__steps">

        <!-- STEP 1: Araç Bilgileri -->
        <div class="step-card">
          <div class="step-card__head">
            <div class="step-num">1</div>
            <div>
              <h2 class="step-card__title">Araç Bilgileri</h2>
              <p class="step-card__sub">{{ o.make }} {{ o.model }} &middot; {{ o.year }}</p>
            </div>
          </div>

          <div class="engine-strip">
            <div class="es__item"><span class="es__k">Marka</span><span class="es__v">{{ o.make || '—' }}</span></div>
            <div class="es__sep"></div>
            <div class="es__item"><span class="es__k">Model</span><span class="es__v">{{ o.model || '—' }}</span></div>
            <div class="es__sep"></div>
            <div class="es__item"><span class="es__k">Yıl</span><span class="es__v">{{ o.year || '—' }}</span></div>
            <div class="es__sep"></div>
            <div class="es__item"><span class="es__k">Motor</span><span class="es__v">{{ o.engine || '—' }}</span></div>
            <div class="es__sep"></div>
            <div class="es__item"><span class="es__k">Yakıt</span>
              <span class="fuel-badge fuel-badge--{{ o.fuelType === 'Benzin' ? 'petrol' : o.fuelType === 'Dizel' ? 'diesel' : 'hybrid' }}">{{ o.fuelType }}</span>
            </div>
          </div>

          <div class="od__detail-row">
            <div class="od__di"><span class="od__dk">Şanzıman</span><span class="od__dv">{{ o.transmission || '—' }}</span></div>
            <div class="od__di"><span class="od__dk">Kilometre</span><span class="od__dv">{{ o.km ? o.km + ' km' : '—' }}</span></div>
            <div class="od__di"><span class="od__dk">ECU</span><span class="od__dv">{{ o.ecu || '—' }}</span></div>
            <div class="od__di"><span class="od__dk">Plaka</span><span class="od__dv" style="text-transform:uppercase">{{ o.plate || '—' }}</span></div>
            <div class="od__di"><span class="od__dk">VIN / Şasi No</span><span class="od__vin">{{ o.vin || '—' }}</span></div>
          </div>
        </div>

        <!-- STEP 2: Servis Detayları -->
        <div class="step-card">
          <div class="step-card__head">
            <div class="step-num">2</div>
            <div>
              <h2 class="step-card__title">Servis Detayları</h2>
              <p class="step-card__sub">{{ o.stage }} &middot; {{ o.ecu }} &middot; {{ o.readMethod }}</p>
            </div>
          </div>

          <div class="od-tune-card od-tune-card--{{ stageKey(o.stage) }}">
            <div class="od-tune-card__left">
              <span class="od-tune-card__badge od-tune-card__badge--{{ stageKey(o.stage) }}">{{ o.stage }}</span>
              <div class="od-tune-card__info">
                <div class="od-tune-card__row"><i class="pi pi-microchip"></i>{{ o.ecu }}</div>
                <div class="od-tune-card__row"><i class="pi pi-database"></i>{{ o.readMethod }} Okuma</div>
              </div>
            </div>
            <div class="od-tune-card__price">{{ o.basePrice }}</div>
          </div>

          <!-- Okuma & ECU bilgileri -->
          <div class="od__extras" style="margin-top:1rem">
            <span class="od__dk">Okuma & ECU Bilgileri</span>
            <div class="od__info-grid">
              <div class="od__info-cell"><span class="od__info-k">Okuma Aracı</span><span class="od__info-v">{{ o.readMethod || '—' }}</span></div>
              <div class="od__info-cell"><span class="od__info-k">Sanal Dosya</span><span class="od__info-v">{{ o.virtualFile ? 'Evet' : 'Hayır' }}</span></div>
              <div class="od__info-cell"><span class="od__info-k">Dinamometre</span><span class="od__info-v">{{ o.dyno ? 'Evet' : 'Hayır' }}</span></div>
              <div class="od__info-cell"><span class="od__info-k">ECU Donanım No</span><span class="od__info-v">{{ o.ecuHw || '—' }}</span></div>
              <div class="od__info-cell"><span class="od__info-k">ECU Parça No</span><span class="od__info-v">{{ o.ecuPart || '—' }}</span></div>
              <div class="od__info-cell"><span class="od__info-k">ECU Yazılım No</span><span class="od__info-v">{{ o.ecuSw || '—' }}</span></div>
            </div>
          </div>

          @if (o.extraServices.length > 0) {
            <div class="od__extras">
              <span class="od__dk">Ek Servisler</span>
              <div class="od__extras-grid">
                @for (s of o.extraServices; track s) {
                  <div class="od-mod-tile">
                    <div class="od-mod-tile__left">
                      <span class="od-mod-tile__icon"><i class="pi pi-check-circle"></i></span>
                      <div>
                        <p class="od-mod-tile__name">{{ s }}</p>
                        <p class="od-mod-tile__desc">{{ extraDesc() }}</p>
                      </div>
                    </div>
                    <span class="od-mod-tile__price">+{{ extraPrice(s) | number }}₺</span>
                  </div>
                }
              </div>
              <div class="od__extras-total">
                <span>Ek Servis Toplamı</span>
                <span class="od__extras-total__val">+{{ extrasTotal() | number }}₺</span>
              </div>
            </div>
          }

          <!-- Genel toplam -->
          <div class="od__grand-total">
            <span>Toplam Tutar</span>
            <span class="od__grand-total__val">{{ o.price }}</span>
          </div>

          <!-- Değiştirilmiş parçalar -->
          @if (o.modifiedParts.length > 0) {
            <div class="od__extras" style="margin-top:1rem">
              <span class="od__dk">Değiştirilmiş Parçalar</span>
              <div class="od__chip-wrap">
                @for (p of o.modifiedParts; track p) {
                  <span class="od__chip"><i class="pi pi-wrench"></i>{{ p }}</span>
                }
              </div>
            </div>
          }

          <!-- Hata kodları (pcode) -->
          @if (o.pcodes.length > 0) {
            <div class="od__extras" style="margin-top:1rem">
              <span class="od__dk">Hata Kodları & Notlar</span>
              <div class="od__pcode-list">
                @for (pc of o.pcodes; track $index) {
                  <div class="od__pcode-row">
                    @if (pc.pcode) { <span class="od__pcode-tag"><i class="pi pi-tag"></i>{{ pc.pcode }}</span> }
                    @if (pc.note) { <span class="od__pcode-note">{{ pc.note }}</span> }
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- STEP 3: Notlar -->
        @if (o.notes) {
          <div class="step-card">
            <div class="step-card__head">
              <div class="step-num">3</div>
              <div>
                <h2 class="step-card__title">Notlar</h2>
                <p class="step-card__sub">Siparişe eklediğiniz özel istekler</p>
              </div>
            </div>
            <div class="od__note-box"><i class="pi pi-comment"></i><p>{{ o.notes }}</p></div>
          </div>
        }

      </div><!-- /steps -->

      <!-- SIDEBAR (right) -->
      <div class="od__sidebar">

        @if (o.queuePosition) {
          <div class="od__queue-card">
            <div class="od__queue-card__icon"><i class="pi pi-sort-numeric-down"></i></div>
            <div class="od__queue-card__body">
              <p class="od__queue-card__lbl">Kuyruk Sırası</p>
              <p class="od__queue-card__val">{{ o.queuePosition }}<span class="od__queue-card__total">. sırada</span></p>
              <p class="od__queue-card__hint">Siparişiniz hazırlanma kuyruğunda {{ o.queuePosition }}. sırada.</p>
            </div>
          </div>
        }

        <!-- File download card -->
        <div class="od__file-card">
          <div class="od__file-card-head">
            <i class="pi pi-file-check od__file-card-icon"
              [class.od__file-card-icon--green]="o.fileAvailable"
              [class.od__file-card-icon--blue]="o.status === 'processing' && !o.fileAvailable"
              [class.od__file-card-icon--amber]="o.status === 'pending'"></i>
            <div>
              <p class="od__file-card-title">Yazılım Dosyası</p>
              @if (o.fileAvailable) {
                <p class="od__file-card-sub od__file-card-sub--green">Hazır — İndirebilirsiniz</p>
              } @else {
                <p class="od__file-card-sub od__file-card-sub--blue">Hazırlanıyor…</p>
              }
            </div>
          </div>

          @if (o.fileAvailable && o.fileName) {
            <div class="od__file-name-row">
              <i class="pi pi-file"></i>
              <span>{{ o.fileName }}</span>
            </div>
            @if (o.fileNote) {
              <div class="od__file-note">
                <i class="pi pi-comment"></i>
                <div>
                  <p class="od__file-note__lbl">Ekibimizden not</p>
                  <p class="od__file-note__txt">{{ o.fileNote }}</p>
                </div>
              </div>
            }
            <button class="od__dl-btn" type="button" [disabled]="downloading(o.dbId)" (click)="download(o)">
              <i class="pi" [class.pi-download]="!downloading(o.dbId)"
                            [class.pi-spin]="downloading(o.dbId)"
                            [class.pi-spinner]="downloading(o.dbId)"></i>
              {{ downloading(o.dbId) ? 'Hazırlanıyor…' : 'Dosyayı İndir' }}
            </button>
          } @else if (o.status === 'processing') {
            <div class="od__progress-hint">
              <div class="od__progress-bar"><div class="od__progress-bar__fill"></div></div>
              <p>Yazılım dosyanız hazırlanıyor, tamamlandığında burada görünecek.</p>
            </div>
          } @else if (o.status === 'pending') {
            <p class="od__file-wait">Ekibimiz siparişinizi inceliyor. Onaylandıktan sonra hazırlanmaya başlanacak.</p>
          }
        </div>

        <!-- Upload original -->
        <div class="step-card" style="padding:1.25rem">
          <div class="step-card__head" style="margin-bottom:0.75rem">
            <div class="step-num step-num--sm">4</div>
            <div>
              <h2 class="step-card__title" style="font-size:0.85rem">Orijinal Dosya <span class="od__opt">(opsiyonel)</span></h2>
              <p class="step-card__sub">Mevcut ECU yazılımınızı yükleyin</p>
            </div>
          </div>

          @if (o.originalFileUploaded && o.originalFileName && !uploadedFile() && !origReuploadMode()) {
            <div class="od__orig-chip">
              <i class="pi pi-file-export"></i>
              <span>{{ o.originalFileName }}</span>
              <span class="od__orig-chip-badge">Yüklendi</span>
            </div>
            <button class="od__change-btn" type="button" (click)="origReuploadMode.set(true)">
              <i class="pi pi-refresh"></i> Dosyayı Değiştir
            </button>
          } @else {
            @if (origReuploadMode() && o.originalFileName) {
              <p class="od__reupload-note"><i class="pi pi-info-circle"></i> Yeni dosya yükleyerek eskisinin üzerine yazabilirsiniz.</p>
            }
            <div class="od__upload-zone" [class.od__upload-zone--filled]="uploadedFile()"
              (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
              @if (!uploadedFile()) {
                <i class="pi pi-cloud-upload"></i>
                <p>.bin · .ori · .hex</p>
                <label class="od__upload-btn">
                  <i class="pi pi-folder-open"></i> Dosya Seç
                  <input type="file" accept=".bin,.ori,.hex,.mod" (change)="onFileSelect($event)" style="display:none" />
                </label>
              } @else {
                <i class="pi pi-file" style="color:#4ade80;font-size:1.2rem;flex-shrink:0"></i>
                <span class="od__upload-fname">{{ uploadedFile()!.name }}</span>
                <button type="button" class="od__rm-btn" (click)="uploadedFile.set(null)"><i class="pi pi-times"></i></button>
              }
            </div>
            <div class="od__upload-actions">
              <button type="button" class="od__send-btn" [disabled]="!uploadedFile() || origSending()" (click)="sendOriginalFile(o)">
                <i class="pi" [class.pi-send]="!origSending()" [class.pi-spin]="origSending()" [class.pi-spinner]="origSending()"></i>
                {{ origSending() ? 'Gönderiliyor…' : (o.originalFileUploaded ? 'Dosyayı Güncelle' : 'Gönder') }}
              </button>
              @if (origReuploadMode()) {
                <button type="button" class="od__cancel-btn" (click)="origReuploadMode.set(false); uploadedFile.set(null)">İptal</button>
              }
            </div>
          }

          @if (fileSent()) {
            <div class="od__sent"><i class="pi pi-check-circle"></i> Dosyanız başarıyla gönderildi.</div>
          }
        </div>

      </div><!-- /sidebar -->
    </div><!-- /layout -->
  </div>
  }
  }

</div>
}
  `,
  styles: [`
    .op { display: flex; flex-direction: column; gap: 1.5rem; min-width: 0; }

    /* ── LIST ── */
    .op__header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
    .op__title  { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .op__sub    { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
    .op__summary {
      display: flex; align-items: center; gap: 1.25rem;
      background: #1a1d27; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 0.875rem 1.4rem;
    }
    .op__si  { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .op__sv  { font-size: 1.15rem; font-weight: 700; color: #fff; }
    .op__sl  { font-size: 0.68rem; color: rgba(255,255,255,0.4); white-space: nowrap; }
    .op__ss  { width: 1px; height: 30px; background: rgba(255,255,255,0.08); }
    .op__si--green  .op__sv { color: #4ade80; }
    .op__si--yellow .op__sv { color: #fbbf24; }
    .op__si--blue   .op__sv { color: #60a5fa; }
    .op__si--red    .op__sv { color: #f87171; }

    .op__filters { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .op__search {
      display: flex; align-items: center; gap: 0.625rem;
      background: #1a1d27; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 0.625rem 1rem;
      flex: 1; min-width: 200px;
      i { color: rgba(255,255,255,0.35); font-size: 0.875rem; }
      input { background: transparent; border: none; outline: none; color: rgba(255,255,255,0.85); font-size: 0.875rem; width: 100%; &::placeholder { color: rgba(255,255,255,0.3); } }
    }
    .op__chips { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .op__chip {
      padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);
      background: #1a1d27; color: rgba(255,255,255,0.5); font-size: 0.8rem; cursor: pointer; transition: all 180ms;
      &:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.85); }
      &--active { background: rgba(230,57,70,0.15); border-color: rgba(230,57,70,0.4); color: #e63946; }
    }

    .op__table-wrap { background: #1a1d27; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow-x: auto; min-width: 0; max-width: 100%; }
    .op__table { width: 100%; border-collapse: collapse; min-width: 1040px;
      thead th { padding: 1rem 1.1rem; font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.06em; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); white-space: nowrap; }
    }
    .op__row { border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; transition: background 160ms;
      &:last-child { border-bottom: none; }
      &:hover { background: rgba(255,255,255,0.025); }
      td { padding: 0.9rem 1.1rem; font-size: 0.82rem; color: rgba(255,255,255,0.7); vertical-align: middle; white-space: nowrap; }
    }
    .op__veh { display: flex; align-items: center; gap: 0.625rem; }
    .op__veh-icon { width: 34px; height: 34px; border-radius: 8px; background: rgba(230,57,70,0.1); color: #e63946; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0; }
    .op__veh-name { font-weight: 600; color: rgba(255,255,255,0.9); margin: 0 0 2px; white-space: nowrap; }
    .op__veh-id   { font-size: 0.68rem; color: rgba(255,255,255,0.3); margin: 0; font-family: monospace; }
    .op__ecu  { font-size: 0.7rem; color: rgba(255,255,255,0.4); margin: 3px 0 0; }
    .op__muted { color: rgba(255,255,255,0.4) !important; white-space: nowrap; }
    .op__price { font-weight: 700; color: #fff !important; white-space: nowrap; }
    .op__empty { text-align: center; padding: 3rem !important; color: rgba(255,255,255,0.3); i { font-size: 2rem; display: block; margin-bottom: 0.5rem; } }
    .op__btn {
      width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); transition: all 180ms;
      &:hover { background: rgba(255,255,255,0.12); color: #fff; }
      &--dl { background: rgba(74,222,128,0.12); color: #4ade80; &:hover { background: rgba(74,222,128,0.2); } }
      &--off { opacity: 0.35; cursor: not-allowed; }
    }

    /* Shared chips */
    .s-chip {
      display: inline-flex; padding: 0.13rem 0.5rem; border-radius: 5px; font-size: 0.67rem; font-weight: 700;
      &--s1 { background: rgba(96,165,250,0.12); color: #60a5fa; border: 1px solid rgba(96,165,250,0.25); }
      &--s2 { background: rgba(230,57,70,0.12);  color: #e63946; border: 1px solid rgba(230,57,70,0.25); }
      &--s3 { background: rgba(167,139,250,0.12);color: #a78bfa; border: 1px solid rgba(167,139,250,0.25); }
    }
    .op__svc { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; }
    .op__svc-chip {
      display: inline-flex; padding: 0.13rem 0.45rem; border-radius: 5px; font-size: 0.64rem; font-weight: 600;
      background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); white-space: nowrap;
    }
    .st-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 0.72rem; font-weight: 600; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
    .st-dot  { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
    .st-chip--pending    { background: rgba(96,165,250,0.12);  color: #60a5fa; }
    .st-chip--processing { background: rgba(96,165,250,0.12);  color: #60a5fa; }
    .st-chip--completed  { background: rgba(74,222,128,0.12);  color: #4ade80; }
    .st-chip--cancelled  { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4); }
    .op__queue { display: inline-flex; align-items: center; gap: 4px; margin-left: 0.4rem; padding: 3px 8px; border-radius: 20px; font-size: 0.68rem; font-weight: 700; background: rgba(168,85,247,0.12); color: #c084fc; white-space: nowrap; i { font-size: 0.7rem; } }
    .od__queue-card { display: flex; gap: 0.85rem; padding: 1rem 1.1rem; border-radius: 14px; background: linear-gradient(135deg, rgba(168,85,247,0.14), rgba(168,85,247,0.05)); border: 1px solid rgba(168,85,247,0.3); margin-bottom: 1rem; }
    .od__queue-card__icon { display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 11px; background: rgba(168,85,247,0.2); color: #c084fc; flex-shrink: 0; i { font-size: 1.2rem; } }
    .od__queue-card__body { min-width: 0; flex: 1; }
    .od__queue-card__lbl { margin: 0 0 2px; font-size: 0.7rem; font-weight: 700; color: rgba(192,132,252,0.9); text-transform: uppercase; letter-spacing: 0.05em; }
    .od__queue-card__val { margin: 0 0 4px; font-size: 1.4rem; font-weight: 800; color: #fff; line-height: 1; }
    .od__queue-card__total { font-size: 0.85rem; font-weight: 600; color: rgba(255,255,255,0.5); margin-left: 4px; }
    .od__queue-card__hint { margin: 0; font-size: 0.72rem; color: rgba(255,255,255,0.55); line-height: 1.35; }

    /* Fuel badges */
    .fuel-badge { display: inline-flex; padding: 0.15rem 0.55rem; border-radius: 6px; font-size: 0.72rem; font-weight: 700;
      &--petrol  { background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.25); }
      &--diesel  { background: rgba(96,165,250,0.12); color: #60a5fa; border: 1px solid rgba(96,165,250,0.25); }
      &--hybrid  { background: rgba(74,222,128,0.12); color: #4ade80; border: 1px solid rgba(74,222,128,0.25); }
    }

    /* ══ DETAIL ══ */
    .od { display: flex; flex-direction: column; gap: 1.5rem; animation: fadeIn 220ms ease both; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    .od__topbar { display: flex; align-items: center; gap: 0.75rem; }
    .od__back {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.6); font-size: 0.82rem; cursor: pointer; transition: all 160ms;
      &:hover { background: rgba(255,255,255,0.07); color: #fff; } i { font-size: 0.75rem; }
    }
    .od__bc { font-size: 0.82rem; color: rgba(255,255,255,0.3); }
    .od__topbar-right { margin-left: auto; display: flex; align-items: center; gap: 0.85rem; }
    .od__price-hero { font-size: 1.1rem; font-weight: 800; color: #fff; }

    /* Progress stepper */
    .od__progress {
      display: flex; align-items: flex-start;
      background: #1a1d27; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 1.25rem 2rem;
      gap: 0;
    }
    .od-ps {
      display: flex; align-items: center; gap: 0.7rem; flex-shrink: 0;
      &__circle {
        width: 36px; height: 36px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center;
        color: rgba(255,255,255,0.3); font-size: 0.8rem; flex-shrink: 0; transition: all 280ms;
      }
      &__text { display: flex; flex-direction: column; gap: 1px; }
      &__label { font-size: 0.75rem; color: rgba(255,255,255,0.4); font-weight: 500; white-space: nowrap; }
      &__hint  { font-size: 0.65rem; color: rgba(255,255,255,0.25); white-space: nowrap; }
      &__line  { flex: 1; height: 2px; background: rgba(255,255,255,0.08); min-width: 24px; margin: 0 0.75rem; margin-top: 17px; align-self: flex-start; transition: background 280ms; &--done { background: rgba(74,222,128,0.5); } }
      &--done .od-ps__circle { border-color: #4ade80; background: rgba(74,222,128,0.12); color: #4ade80; }
      &--done .od-ps__label  { color: rgba(255,255,255,0.6); }
      &--active .od-ps__circle { border-color: #60a5fa; background: rgba(96,165,250,0.15); color: #60a5fa; box-shadow: 0 0 16px rgba(96,165,250,0.3); }
      &--active .od-ps__label  { color: #60a5fa; font-weight: 700; }
    }
    .od__cancelled { display: flex; align-items: flex-start; gap: 0.65rem; padding: 0.85rem 1.25rem; border-radius: 12px; background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2); color: #f87171; font-size: 0.85rem; > i { font-size: 1.05rem; margin-top: 2px; flex-shrink: 0; } > div { min-width: 0; flex: 1; } }

    /* Checkout layout */
    .od__layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 340px); gap: 1.5rem; align-items: start; width: 100%; @media(max-width:1100px) { grid-template-columns: minmax(0, 1fr); } }
    .od__steps  { display: flex; flex-direction: column; gap: 1.25rem; min-width: 0; }
    .od__sidebar { display: flex; flex-direction: column; gap: 1.25rem; min-width: 0; }

    /* Step card — matches tools-page */
    .step-card {
      background: #1a1d27; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 1.75rem;
      &__head { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; }
      &__title { font-size: 1rem; font-weight: 700; color: #fff; margin: 0 0 2px; }
      &__sub   { font-size: 0.78rem; color: rgba(255,255,255,0.4); margin: 0; }
    }
    .step-num {
      width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
      background: linear-gradient(135deg, #e63946, #c1121f);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.85rem; font-weight: 800; color: #fff;
      &--sm { width: 26px; height: 26px; border-radius: 8px; font-size: 0.75rem; }
    }
    .od__opt { font-size: 0.62rem; color: rgba(255,255,255,0.2); font-weight: 400; }

    /* Engine info strip */
    .engine-strip {
      display: flex; flex-wrap: wrap;
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px; overflow: hidden; margin-bottom: 1rem;
    }
    .es__item { flex: 1; min-width: 110px; display: flex; flex-direction: column; gap: 4px; padding: 0.875rem 1.1rem; }
    .es__sep  { width: 1px; align-self: stretch; background: rgba(255,255,255,0.06); flex-shrink: 0; }
    .es__k { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.3); }
    .es__v { font-size: 0.82rem; font-weight: 700; color: rgba(255,255,255,0.85); }

    /* Detail row */
    .od__detail-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.85rem; }
    .od__di { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 3px; }
    .od__dk { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.3); }
    .od__dv { font-size: 0.85rem; font-weight: 600; color: rgba(255,255,255,0.85); }
    .od__vin-row { display: flex; flex-direction: column; gap: 4px; padding: 0.75rem 1rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; }
    .od__vin { font-family: 'Courier New', monospace; font-size: 0.82rem; font-weight: 700; color: #e63946; letter-spacing: 0.04em; }

    /* Tune display card */
    .od-tune-card {
      display: flex; align-items: center; gap: 1rem; padding: 1.1rem 1.25rem; border-radius: 14px; margin-bottom: 1rem;
      border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
      &--s1 { border-color: rgba(96,165,250,0.25); background: rgba(96,165,250,0.05); }
      &--s2 { border-color: rgba(230,57,70,0.25);  background: rgba(230,57,70,0.05);  }
      &--s3 { border-color: rgba(167,139,250,0.25);background: rgba(167,139,250,0.05);}
      &__left { flex: 1; display: flex; align-items: center; gap: 1rem; min-width: 0; }
      &__badge { padding: 0.3rem 0.75rem; border-radius: 8px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0;
        &--s1 { background: rgba(96,165,250,0.15); color: #60a5fa; border: 1px solid rgba(96,165,250,0.3); }
        &--s2 { background: rgba(230,57,70,0.15);  color: #e63946; border: 1px solid rgba(230,57,70,0.3); }
        &--s3 { background: rgba(167,139,250,0.15);color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); }
      }
      &__info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
      &__row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: rgba(255,255,255,0.7); i { font-size: 0.7rem; color: rgba(255,255,255,0.3); flex-shrink: 0; } }
      &__price { font-size: 1.1rem; font-weight: 800; color: #fff; white-space: nowrap; flex-shrink: 0; }
    }

    /* Extra services module tiles */
    .od__extras { margin-top: 0.25rem; display: flex; flex-direction: column; gap: 0.65rem; }
    .od__extras-grid { display: flex; flex-direction: column; gap: 0.4rem; }
    .od-mod-tile {
      display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
      padding: 0.7rem 1rem; border-radius: 11px;
      background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.14);
      &__left  { display: flex; align-items: center; gap: 0.65rem; flex: 1; min-width: 0; }
      &__icon  { width: 28px; height: 28px; border-radius: 8px; background: rgba(245,158,11,0.12); color: #f59e0b; display: flex; align-items: center; justify-content: center; flex-shrink: 0; i { font-size: 0.75rem; } }
      &__name  { font-size: 0.8rem; font-weight: 700; color: #fff; margin: 0 0 2px; }
      &__desc  { font-size: 0.68rem; color: rgba(255,255,255,0.35); margin: 0; }
      &__price { font-size: 0.82rem; font-weight: 800; color: #f59e0b; flex-shrink: 0; white-space: nowrap; }
    }
    .od__extras-total {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.55rem 1rem; border-radius: 10px;
      background: rgba(245,158,11,0.08); border: 1px dashed rgba(245,158,11,0.25);
      font-size: 0.72rem; color: rgba(255,255,255,0.4); font-weight: 600;
      &__val { font-size: 0.88rem; font-weight: 800; color: #f59e0b; }
    }
    .od__grand-total {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 1rem; padding: 0.7rem 1rem; border-radius: 10px;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
      font-size: 0.8rem; color: rgba(255,255,255,0.6); font-weight: 700;
      &__val { font-size: 1.05rem; font-weight: 800; color: #fff; }
    }
    .od__chip-wrap { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .od__chip {
      display: inline-flex; align-items: center; gap: 0.35rem;
      font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.75);
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      padding: 4px 10px; border-radius: 20px;
      i { font-size: 0.7rem; color: #60a5fa; }
    }
    .od__pcode-list { display: flex; flex-direction: column; gap: 0.4rem; }
    .od__pcode-row {
      display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;
      padding: 0.5rem 0.75rem; border-radius: 10px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
    }
    .od__pcode-tag {
      display: inline-flex; align-items: center; gap: 0.3rem; flex-shrink: 0;
      font-family: 'Courier New', monospace; font-size: 0.75rem; font-weight: 800;
      color: #e63946; background: rgba(230,57,70,0.12); padding: 2px 8px; border-radius: 6px;
      i { font-size: 0.65rem; }
    }
    .od__pcode-note { font-size: 0.78rem; color: rgba(255,255,255,0.6); }
    .od__info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
    @media (max-width: 640px) { .od__info-grid { grid-template-columns: repeat(2, 1fr); } }
    .od__info-cell {
      display: flex; flex-direction: column; gap: 3px;
      padding: 0.55rem 0.75rem; border-radius: 10px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
    }
    .od__info-k { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.35); font-weight: 700; }
    .od__info-v { font-size: 0.82rem; color: #fff; font-weight: 600; word-break: break-word; }

    /* Notes */
    .od__note-box { display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); font-size: 0.85rem; color: rgba(255,255,255,0.65); i { color: #f59e0b; flex-shrink: 0; font-size: 1rem; margin-top: 1px; } p { margin: 0; line-height: 1.5; } }

    /* File card (sidebar) */
    .od__file-card {
      background: #1a1d27; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 1.5rem;
    }
    .od__file-card-head { display: flex; align-items: flex-start; gap: 0.85rem; margin-bottom: 1rem; }
    .od__file-card-icon { font-size: 1.75rem; color: rgba(255,255,255,0.2); flex-shrink: 0; &--green { color: #4ade80; } &--blue { color: #60a5fa; } &--amber { color: #f59e0b; } }
    .od__file-card-title { font-size: 0.9rem; font-weight: 700; color: #fff; margin: 0 0 3px; }
    .od__file-card-sub { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin: 0; &--green { color: #4ade80; } &--blue { color: #60a5fa; } }
    .od__file-name-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 0.85rem; border-radius: 10px; background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.15); margin-bottom: 0.85rem; font-size: 0.78rem; font-family: monospace; color: #fff; overflow: hidden; i { color: #4ade80; flex-shrink: 0; } span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } }
    .od__file-note {
      display: flex; align-items: flex-start; gap: 0.6rem;
      padding: 0.75rem 0.9rem; border-radius: 10px;
      background: linear-gradient(135deg, rgba(96,165,250,0.12), rgba(96,165,250,0.05));
      border: 1px solid rgba(96,165,250,0.28); margin-bottom: 0.85rem;
    }
    .od__file-note > i { color: #60a5fa; font-size: 1rem; line-height: 1.2; margin-top: 1px; flex-shrink: 0; }
    .od__file-note > div { min-width: 0; flex: 1; }
    .od__file-note__lbl { margin: 0 0 0.25rem; font-size: 0.68rem; font-weight: 700; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.06em; }
    .od__file-note__txt { margin: 0; font-size: 0.82rem; color: #fff; line-height: 1.5; white-space: pre-wrap; word-break: break-word; font-family: inherit; }
    .od__dl-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; padding: 0.75rem; border-radius: 12px; border: none; cursor: pointer; background: linear-gradient(135deg,#4ade80,#16a34a); color: #000; font-size: 0.9rem; font-weight: 700; &:hover { opacity: 0.9; } }
    .od__progress-hint { p { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin: 0.5rem 0 0; } }
    .od__progress-bar { height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; &__fill { height: 100%; width: 60%; background: linear-gradient(90deg,#60a5fa,#93c5fd); border-radius: 2px; animation: shimmer 2s ease-in-out infinite; } }
    @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
    .od__file-wait { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin: 0; line-height: 1.5; }

    /* Orig file chip */
    .od__orig-chip { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border-radius: 8px; background: rgba(96,165,250,0.06); border: 1px solid rgba(96,165,250,0.15); margin-bottom: 0.65rem; font-size: 0.75rem; color: rgba(255,255,255,0.7); overflow: hidden; i { color: #60a5fa; flex-shrink: 0; } span:first-of-type { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; } }
    .od__orig-chip-badge { font-size: 0.65rem; font-weight: 700; color: #60a5fa; background: rgba(96,165,250,0.12); padding: 1px 8px; border-radius: 10px; flex-shrink: 0; }

    /* Upload zone */
    .od__upload-zone {
      border: 2px dashed rgba(255,255,255,0.1); border-radius: 12px; background: rgba(255,255,255,0.02);
      display: flex; flex-direction: column; align-items: center; gap: 0.45rem; padding: 1.25rem; text-align: center;
      i { font-size: 1.4rem; color: rgba(255,255,255,0.2); }
      p { font-size: 0.75rem; color: rgba(255,255,255,0.25); margin: 0; }
      &--filled { flex-direction: row; padding: 0.65rem 0.85rem; border-color: rgba(74,222,128,0.3); background: rgba(74,222,128,0.03); }
    }
    .od__upload-btn { display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 0.4rem 0.85rem; font-size: 0.75rem; color: rgba(255,255,255,0.7); &:hover { background: rgba(255,255,255,0.12); } }
    .od__upload-fname { flex: 1; font-size: 0.75rem; color: rgba(255,255,255,0.8); text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; }
    .od__upload-acts { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }
    .od__send-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.65rem; border-radius: 10px; border: none; background: linear-gradient(135deg,#4ade80,#16a34a); color: #000; font-size: 0.82rem; font-weight: 700; cursor: pointer; &:hover:not(:disabled) { opacity: 0.9; } &:disabled { opacity: 0.3; cursor: not-allowed; } }
    .od__rm-btn { border: none; background: transparent; color: rgba(255,255,255,0.3); cursor: pointer; &:hover { color: #fff; } }
    .od__sent { margin-top: 0.6rem; display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: #4ade80; }
    .od__upload-actions { display: flex; gap: 0.6rem; margin-top: 0.6rem; }
    .od__cancel-btn { padding: 0.65rem 1rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.55); font-size: 0.8rem; cursor: pointer; &:hover { background: rgba(255,255,255,0.06); color: #fff; } }
    .od__change-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem; border-radius: 10px; cursor: pointer; background: transparent; border: 1px dashed rgba(255,255,255,0.15); color: rgba(255,255,255,0.65); font-size: 0.8rem; font-weight: 600; margin-top: 0.5rem; &:hover { background: rgba(255,255,255,0.05); color: #fff; border-color: rgba(255,255,255,0.25); } }
    .od__reupload-note { font-size: 0.72rem; color: rgba(96,165,250,0.85); margin: 0 0 0.5rem; display: flex; align-items: flex-start; gap: 0.35rem; i { color: #60a5fa; flex-shrink: 0; } }
  `],
})
export class OrdersPage implements OnInit {
  private readonly ordersApi = inject(OrdersService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly selectedOrder = signal<UserOrder | null>(null);
  protected readonly currentView   = signal<'list' | 'detail'>('list');
  protected readonly activeFilter  = signal<string>('all');
  protected readonly search        = signal('');
  protected readonly uploadedFile  = signal<File | null>(null);
  protected readonly origReuploadMode = signal(false);
  protected readonly origSending   = signal(false);
  protected readonly fileSent      = signal(false);
  protected readonly loading       = signal(true);
  protected readonly loadError     = signal('');
  protected readonly downloadingId = signal<string | null>(null);
  protected downloading(id?: string): boolean {
    const cur = this.downloadingId();
    return id ? cur === id : cur !== null;
  }

  ngOnInit(): void {
    // Cache varsa anında göster (skeleton yok), her durumda arka planda tazele.
    const cached = this.ordersApi.peekMyOrders();
    if (cached) { this.orders.set(cached.map(mapOrder)); this.loading.set(false); }

    this.ordersApi.listMyOrders()
      .then(data => { this.orders.set(data.map(mapOrder)); this.loadError.set(''); })
      .catch(() => { if (!cached) { this.loadError.set('Siparişler yüklenemedi.'); } })
      .finally(() => { this.loading.set(false); this.cdr.markForCheck(); });
  }

  async download(o: UserOrder): Promise<void> {
    if (this.downloadingId()) { return; }
    this.downloadingId.set(o.dbId);
    try {
      const res = await this.ordersApi.getDownloadUrl(o.dbId);
      await triggerDownload(res.url, res.fileName);
    } catch {
      this.loadError.set('Dosya indirilemedi.');
    } finally {
      this.downloadingId.set(null);
      this.cdr.markForCheck();
    }
  }

  protected readonly filterOptions = [
    { label: 'Tümü',       value: 'all'        },
    { label: 'Hazırlanıyor', value: 'pending'    },
    { label: 'Tamamlandı',   value: 'completed'  },
    { label: 'İptal',        value: 'cancelled'  },
  ];

  protected readonly progressSteps = [
    { label: 'Sipariş Alındı', icon: 'pi-check-circle', rank: 0, hint: '' },
    { label: 'Hazırlanıyor',   icon: 'pi-cog',           rank: 1, hint: 'Dosya hazırlanıyor' },
    { label: 'Tamamlandı',     icon: 'pi-check',         rank: 2, hint: '' },
  ];

  protected readonly orders = signal<UserOrder[]>([]);

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    const f = this.activeFilter();
    return this.orders().filter(o => {
      const matchQ = !q || `${o.make} ${o.model}`.toLowerCase().includes(q) || o.id.toLowerCase().includes(q);
      const matchF = f === 'all'
        || (f === 'pending' && (o.status === 'pending' || o.status === 'processing'))
        || o.status === f;
      return matchQ && matchF;
    });
  });

  /* ─── Sayfalama (10/sayfa) ─── */
  protected readonly pageSize = 10;
  protected readonly page     = signal(1);
  protected readonly paged    = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });
  private readonly _resetPage = effect(() => {
    // Filtre veya arama değiştiğinde 1. sayfaya dön.
    this.search(); this.activeFilter();
    this.page.set(1);
  });

  countBy(s: OrderStatus): number {
    if (s === 'pending') {
      return this.orders().filter(o => o.status === 'pending' || o.status === 'processing').length;
    }
    return this.orders().filter(o => o.status === s).length;
  }
  extraDesc(): string { return ''; }
  extraPrice(name: string): number { return this.selectedOrder()?.priceMap[name] ?? 0; }
  extrasTotal(): number { return this.selectedOrder()?.extrasTotalValue ?? 0; }

  statusLabel(s: OrderStatus): string { return STATUS_LABEL[s]; }
  stageKey(s: string): string { return s === 'Stage 1' ? 's1' : s === 'Stage 2' ? 's2' : 's3'; }
  progressRank(s: OrderStatus): number { return { pending: 1, processing: 1, completed: 3, cancelled: 0 }[s]; }

  openDetail(o: UserOrder): void {
    this.selectedOrder.set(o);
    this.uploadedFile.set(null);
    this.fileSent.set(false);
    this.origReuploadMode.set(false);
    this.currentView.set('detail');
  }
  goBack(): void { this.currentView.set('list'); this.selectedOrder.set(null); }

  onFileSelect(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.uploadedFile.set(file); this.fileSent.set(false);
  }
  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0] ?? null;
    if (file) { this.uploadedFile.set(file); this.fileSent.set(false); }
  }
  async sendOriginalFile(o: UserOrder): Promise<void> {
    const file = this.uploadedFile();
    if (!file || this.origSending()) { return; }
    this.origSending.set(true);
    try {
      const res = await this.ordersApi.uploadOriginalFile(o.dbId, file);
      this.orders.update(list => list.map(x => x.dbId === o.dbId
        ? { ...x, originalFileUploaded: true, originalFileName: res.fileName } : x));
      this.selectedOrder.update(sel => sel?.dbId === o.dbId
        ? { ...sel, originalFileUploaded: true, originalFileName: res.fileName } : sel);
      this.uploadedFile.set(null);
      this.origReuploadMode.set(false);
      this.fileSent.set(true);
    } catch {
      this.loadError.set('Dosya yüklenemedi.');
    } finally {
      this.origSending.set(false);
      this.cdr.markForCheck();
    }
  }
}
