import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { PrivacyService } from '../../../../core/privacy.service';
import { AccountService } from '../../../../core/account/account.service';
import {
  Brand,
  Engine,
  FuelType,
  Model,
  Series,
  Service,
  CatalogService,
} from '../../../../core/catalog/catalog.service';
import { OrdersService, CreateOrderPayload } from '../../../../core/orders/orders.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { I18nService } from '../../../../core/i18n/i18n.service';

/* ─── TYPES ─────────────────────────────────────────── */
type TabKey = 'module' | 'tuning';
/**
 * Görsel stage seviyeleri. DB'de yalnızca Stage 1 verisi var; Stage 2/3
 * kartları kilitli (seçilemez) gösterilir, bu yüzden seçili değer hep 'stage1'.
 */
type StageKey = 'stage1' | 'stage2' | 'stage3';
interface PcodeNote { pcode: string; note: string; }

/* ─── MODÜL TAB — ECU SEÇİM LİSTELERİ ─────────────────
   Katalogda (engines.ecu) ECU verisi henüz yok; bu listeler yalnızca
   modül siparişi / ECU seçimi için input kolaylığı sağlar. */
const VAG_ECUS = ['EDC17C64', 'EDC17CP14', 'EDC17CP44', 'MED17.5', 'MG1CS011', 'Simos 18.1', 'Simos 18.10'];
const BMW_ECUS = ['Bosch MG1CS001', 'Bosch MG1CS024', 'Bosch MED17.2', 'Bosch MEV17.4'];
const MERC_ECUS = ['Bosch MED17.7.2', 'Bosch MDG1', 'Delphi CRD3.x'];
const OTHER_ECUS = ['Bosch EDC17C60', 'Bosch MD1CS003', 'Bosch ME17.9'];

const BRANDS_MODULE = [
  { label: 'VAG (VW/Audi/Seat/Skoda)', ecus: VAG_ECUS },
  { label: 'BMW / Mini',               ecus: BMW_ECUS },
  { label: 'Mercedes-Benz',            ecus: MERC_ECUS },
  { label: 'Diğer',                    ecus: OTHER_ECUS },
];

/** Markaya özel ECU bulunamazsa kullanılacak genel ECU havuzu. */
const FALLBACK_ECUS = [...VAG_ECUS, ...BMW_ECUS, ...MERC_ECUS, ...OTHER_ECUS];

/** Servis kategorilerinin gösterim sırası. */
const GROUP_ORDER = ['Emisyon', 'Motor', 'Performans', 'Konfor', 'Egzoz', 'Güvenlik'];

@Component({
  selector: 'app-tools-page',
  standalone: true,
  imports: [DecimalPipe, FormsModule, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tp">

      <!-- PAGE HEADER -->
      <div class="tp__header">
        <h1 class="tp__title">{{ 'tl.title' | t }}</h1>
      </div>

      @if (catalogError()) {
        <div class="fields-hint" style="border-color:rgba(230,57,70,0.4)">
          <i class="pi pi-exclamation-triangle"></i> {{ catalogError() }}
        </div>
      }

      <!-- TAB BAR -->
      <div class="tab-bar" role="tablist">
        <button
          class="tab-btn"
          [class.tab-btn--active]="activeTab() === 'tuning'"
          (click)="activeTab.set('tuning')"
          role="tab"
          [attr.aria-selected]="activeTab() === 'tuning'"
        >
          <i class="pi pi-bolt"></i> Chip Tuning
        </button>
        <button
          class="tab-btn"
          [class.tab-btn--active]="activeTab() === 'module'"
          (click)="activeTab.set('module')"
          role="tab"
          [attr.aria-selected]="activeTab() === 'module'"
        >
          <i class="pi pi-sliders-v"></i> {{ 'tl.tab.modules' | t }}
        </button>
      </div>

      <!-- ══════════════════ MODULE TAB ══════════════════ -->
      @if (activeTab() === 'module') {
        <div class="module-tab">

          <!-- STEP 1: ARAÇ & DOSYA -->
          <div class="step-card">
            <div class="step-card__head">
              <div class="step-num">1</div>
              <div>
                <h2 class="step-card__title">{{ 'tl.m.step1Title' | t }}</h2>
                <p class="step-card__sub">{{ 'tl.m.step1Sub' | t }}</p>
              </div>
            </div>

            <div class="vehicle-row">
              <div class="sel-group">
                <label class="sel-label" for="mod-brand">{{ 'tl.brand' | t }}</label>
                <div class="sel-wrap">
                  <select id="mod-brand" class="sel" (change)="onModBrand($event)">
                    <option value="">{{ 'tl.selectBrand' | t }}</option>
                    @for (b of brandsModule; track b.label) {
                      <option [value]="b.label">{{ b.label }}</option>
                    }
                  </select>
                  <i class="pi pi-chevron-down sel-arrow"></i>
                </div>
              </div>
              <div class="sel-group">
                <label class="sel-label" for="mod-ecu">ECU</label>
                <div class="sel-wrap">
                  <select id="mod-ecu" class="sel" [disabled]="!modBrand()" (change)="onModEcu($event)">
                    <option value="">{{ 'tl.selectEcu' | t }}</option>
                    @for (e of availableEcus(); track e) {
                      <option [value]="e">{{ e }}</option>
                    }
                  </select>
                  <i class="pi pi-chevron-down sel-arrow"></i>
                </div>
              </div>
              <div class="auto-id-toggle">
                <button
                  class="toggle-btn"
                  [class.toggle-btn--on]="autoId()"
                  (click)="autoId.set(!autoId())"
                  type="button"
                  [attr.aria-label]="'Auto Identification ' + (autoId() ? 'aktif' : 'pasif')"
                >
                  <span class="toggle-btn__track">
                    <span class="toggle-btn__thumb"></span>
                  </span>
                </button>
                <span class="auto-id-lbl">Auto Identification</span>
              </div>
            </div>

            <!-- FILE UPLOAD -->
            <div
              class="upload-zone"
              [class.upload-zone--drag]="isDragging()"
              [class.upload-zone--filled]="uploadedFile()"
              (dragover)="onDragOver($event)"
              (dragleave)="isDragging.set(false)"
              (drop)="onDrop($event)"
            >
              @if (!uploadedFile()) {
                <div class="upload-zone__inner">
                  <div class="upload-zone__icon">
                    <i class="pi pi-cloud-upload"></i>
                  </div>
                  <p class="upload-zone__title">{{ 'tl.dragDrop' | t }}</p>
                  <p class="upload-zone__hint">{{ 'tl.formats' | t }}</p>
                  <label class="upload-zone__btn">
                    <i class="pi pi-folder-open"></i> {{ 'tl.selectFile' | t }}
                    <input
                      type="file"
                      accept=".bin,.ori,.hex,.mod,.kess,.ktag"
                      (change)="onFileSelect($event)"
                      style="display:none"
                    />
                  </label>
                </div>
              } @else {
                <div class="upload-file-info">
                  <div class="upload-file-info__icon">
                    <i class="pi pi-file"></i>
                  </div>
                  <div class="upload-file-info__body">
                    <span class="upload-file-info__name">{{ uploadedFile()!.name }}</span>
                    <span class="upload-file-info__meta">{{ formatSize(uploadedFile()!.size) }} · {{ 'tl.ready' | t }}</span>
                  </div>
                  <button class="upload-file-info__remove" (click)="uploadedFile.set(null)" type="button" [attr.aria-label]="'tl.removeFile' | t">
                    <i class="pi pi-times"></i>
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- STEP 2: MODÜL SEÇİMİ -->
          <div class="step-card">
            <div class="step-card__head">
              <div class="step-num">2</div>
              <div>
                <h2 class="step-card__title">{{ 'tl.m.step2Title' | t }}</h2>
                <p class="step-card__sub">{{ 'tl.m.step2Sub' | t }}</p>
              </div>
              <div class="step-card__actions">
                <button class="ghost-btn" (click)="selectAll()" type="button">{{ 'tl.selectAll' | t }}</button>
                <button class="ghost-btn ghost-btn--danger" (click)="clearAll()" type="button">{{ 'tl.clear' | t }}</button>
              </div>
            </div>

            @for (group of groups(); track group) {
              <div class="mod-group">
                <h3 class="mod-group__title">{{ group }}</h3>
                <div class="mod-grid">
                  @for (mod of modulesByGroup(group); track mod.code) {
                    <button
                      class="mod-tile"
                      [class.mod-tile--on]="isSelected(mod.code)"
                      (click)="toggleModule(mod.code)"
                      type="button"
                    >
                      <div class="mod-tile__top">
                        <span class="mod-tile__label">{{ mod.label }}</span>
                        <span class="mod-indicator" [class.mod-indicator--on]="isSelected(mod.code)">
                          {{ isSelected(mod.code) ? 'ON' : 'OFF' }}
                        </span>
                      </div>
                      <p class="mod-tile__desc">{{ mod.description }}</p>
                      @if (!pricesHidden()) { <span class="mod-tile__price">+{{ mod.price | number }}₺</span> }
                    </button>
                  }
                </div>
              </div>
            }
          </div>

          <!-- SUMMARY + CTA -->
          @if (selectedModules().size > 0) {
            @if (!orderSent()) {
              <div class="mod-note">
                <label class="mod-note__lbl" for="mod-order-note"><i class="pi pi-comment"></i> {{ 'tl.teamNote' | t }}</label>
                <textarea id="mod-order-note" class="mod-note__input" rows="2" maxlength="1000"
                  [placeholder]="'tl.teamNotePh' | t"
                  [ngModel]="orderNote()" (ngModelChange)="orderNote.set($event)"></textarea>
              </div>
            }
            <div class="order-summary">
              <div class="order-summary__left">
                <span class="order-summary__count">{{ 'tl.modulesSelected' | t:{ n: selectedModules().size } }}</span>
                <div class="order-summary__chips">
                  @for (code of selectedArray(); track code) {
                    <span class="order-chip">{{ labelOf(code) }}</span>
                  }
                </div>
              </div>
              <div class="order-summary__right">
                @if (!pricesHidden()) {
                  <div class="order-summary__total">
                    <span class="order-summary__total-lbl">{{ 'tl.total' | t }}</span>
                    <span class="order-summary__total-val">{{ totalPrice() | number }}₺</span>
                  </div>
                }
                <button class="cta-btn cta-btn--primary" type="button"
                  [disabled]="orderSubmitting()" (click)="submitOrder()">
                  <i class="pi" [class.pi-send]="!orderSubmitting()" [class.pi-spin]="orderSubmitting()" [class.pi-spinner]="orderSubmitting()"></i>
                  {{ orderSubmitting() ? ('tl.sending' | t) : ('tl.placeOrder' | t) }}
                </button>
              </div>
            </div>
            @if (orderError()) { <p class="fields-hint" style="border-color:rgba(230,57,70,0.4)"><i class="pi pi-exclamation-triangle"></i> {{ orderError() }}</p> }
          }

          <!-- ORDER SUCCESS -->
          @if (orderSent()) {
            <div class="order-success">
              <div class="order-success__icon"><i class="pi pi-check-circle"></i></div>
              <div class="order-success__body">
                <h3>{{ 'tl.orderReceived' | t }} <span class="order-success__no">{{ orderNo() }}</span></h3>
                <p>{{ 'tl.m.successText' | t:{ n: selectedModules().size } }}</p>
              </div>
              <button class="ghost-btn" (click)="resetOrder()" type="button">{{ 'tl.newOrder' | t }}</button>
            </div>
          }

        </div>
      }

      <!-- ══════════════════ TUNING TAB ══════════════════ -->
      @if (activeTab() === 'tuning') {
        <div class="tuning-tab">

          <div class="step-card">
            <div class="step-card__head">
              <div class="step-num">1</div>
              <div>
                <h2 class="step-card__title">{{ 'tl.t.step1Title' | t }}</h2>
                <p class="step-card__sub">{{ 'tl.t.step1Sub' | t }}</p>
              </div>
              <div class="step-card__actions">
                <button class="ghost-btn ghost-btn--danger" type="button" (click)="resetAll()"
                  [disabled]="!selBrandId() && !selYear() && !selTransmission() && !selKm() && !selPlate()">
                  <i class="pi pi-refresh"></i> {{ 'tl.clear' | t }}
                </button>
              </div>
            </div>

            <div class="vehicle-row">

              <!-- ROW 1: Marka | Model -->
              <div class="sel-group">
                <label class="sel-label" for="t-brand">{{ 'tl.brand' | t }}</label>
                <div class="sel-wrap">
                  <select id="t-brand" class="sel" [value]="selBrandId()" (change)="onBrand($event)">
                    <option value="">{{ 'tl.selectBrand2' | t }}</option>
                    @for (b of brandsList(); track b.id) {
                      <option [value]="b.id">{{ b.name }}</option>
                    }
                  </select>
                  <i class="pi pi-chevron-down sel-arrow"></i>
                </div>
              </div>
              <div class="sel-group">
                <label class="sel-label" for="t-model">{{ 'tl.model' | t }}</label>
                <div class="sel-wrap">
                  <select id="t-model" class="sel" [value]="selModelId()" [disabled]="!selBrandId()" (change)="onModel($event)">
                    <option value="">{{ 'tl.selectModel' | t }}</option>
                    @for (m of modelsList(); track m.id) {
                      <option [value]="m.id">{{ m.name }}</option>
                    }
                  </select>
                  <i class="pi pi-chevron-down sel-arrow"></i>
                </div>
              </div>

              <!-- ROW 2: Nesil | Motor | ECU -->
              <div class="sel-group">
                <label class="sel-label" for="t-series">{{ 'tl.series' | t }}</label>
                <div class="sel-wrap">
                  <select id="t-series" class="sel" [value]="selSeriesId()" [disabled]="!selModelId()" (change)="onSeries($event)">
                    <option value="">{{ 'tl.selectSeries' | t }}</option>
                    @for (s of seriesList(); track s.id) {
                      <option [value]="s.id">{{ s.name }}</option>
                    }
                  </select>
                  <i class="pi pi-chevron-down sel-arrow"></i>
                </div>
              </div>
              <div class="sel-group">
                <label class="sel-label" for="t-engine">{{ 'tl.engine' | t }}</label>
                <div class="sel-wrap">
                  <select id="t-engine" class="sel" [value]="selEngineId()" [disabled]="!selSeriesId()" (change)="onEngine($event)">
                    <option value="">{{ 'tl.selectEngine' | t }}</option>
                    @for (e of enginesList(); track e.id) {
                      <option [value]="e.id">{{ e.label }}</option>
                    }
                  </select>
                  <i class="pi pi-chevron-down sel-arrow"></i>
                </div>
              </div>
              <div class="sel-group">
                <label class="sel-label" for="t-ecu">ECU</label>
                <div class="sel-wrap">
                  <select id="t-ecu" class="sel" [disabled]="!selEngineId()" [(ngModel)]="selEcuVal" (ngModelChange)="selEcu.set($event); calculated.set(false)">
                    <option value="">{{ 'tl.selectEcu2' | t }}</option>
                    @for (ec of availableEcuOptions(); track ec) {
                      <option [value]="ec">{{ ec }}</option>
                    }
                  </select>
                  <i class="pi pi-chevron-down sel-arrow"></i>
                </div>
              </div>

              <!-- ROW 3: Yıl | Şanzıman | Kilometre -->
              <div class="sel-group">
                <label class="sel-label" for="t-year">{{ 'tl.year' | t }}</label>
                <div class="sel-wrap">
                  <select id="t-year" class="sel" [disabled]="!selEcu()" [(ngModel)]="selYearVal" (ngModelChange)="selYear.set($event); calculated.set(false)">
                    <option value="">{{ 'tl.selectYear' | t }}</option>
                    @for (y of yearOptions(); track y) {
                      <option [value]="y">{{ y }}</option>
                    }
                  </select>
                  <i class="pi pi-chevron-down sel-arrow"></i>
                </div>
              </div>
              <div class="sel-group">
                <label class="sel-label" for="t-transmission">{{ 'tl.transmission' | t }}</label>
                <div class="sel-wrap">
                  <select id="t-transmission" class="sel" [disabled]="!selYear()" [(ngModel)]="selTransmissionVal" (ngModelChange)="selTransmission.set($event); calculated.set(false)">
                    <option value="">{{ 'tl.selectTransmission' | t }}</option>
                    @for (t of transmissionOptions; track t) {
                      <option [value]="t">{{ t }}</option>
                    }
                  </select>
                  <i class="pi pi-chevron-down sel-arrow"></i>
                </div>
              </div>
              <div class="sel-group">
                <label class="sel-label" for="t-km">{{ 'tl.km' | t }}</label>
                <div class="input-wrap">
                  <input id="t-km" class="text-input" type="number" [placeholder]="'tl.kmPh' | t" min="0"
                    [disabled]="!selTransmission()"
                    [(ngModel)]="selKmVal" (ngModelChange)="selKm.set($event); calculated.set(false)" />
                  <span class="input-suffix">km</span>
                </div>
              </div>

              <!-- ROW 4: Plaka (tek kolon) -->
              <div class="sel-group">
                <label class="sel-label" for="t-plate">{{ 'tl.plate' | t }}</label>
                <input id="t-plate" class="text-input" type="text" [placeholder]="'tl.platePh' | t"
                  style="text-transform:uppercase"
                  [disabled]="!selKm()"
                  [(ngModel)]="selPlateVal" (ngModelChange)="selPlate.set($event); calculated.set(false)" />
              </div>

            </div>

            <!-- AUTO-FILL ENGINE INFO STRIP — Hesapla'dan sonra görünür -->
            @if (selEngine() && calculated()) {
              <div class="engine-info-strip">
                <div class="engine-info-item">
                  <span class="engine-info-k">{{ 'tl.engineCode' | t }}</span>
                  <span class="engine-info-v engine-info-v--code">{{ selEngine()!.engineNo || '—' }}</span>
                </div>
                <div class="engine-info-sep"></div>
                <div class="engine-info-item">
                  <span class="engine-info-k">{{ 'tl.displacement' | t }}</span>
                  <span class="engine-info-v">{{ selEngine()!.displacementCc ? (selEngine()!.displacementCc | number) + ' cc' : '—' }}</span>
                </div>
                <div class="engine-info-sep"></div>
                <div class="engine-info-item">
                  <span class="engine-info-k">Bore × Stroke</span>
                  <span class="engine-info-v">{{ selEngine()!.bore || '—' }}</span>
                </div>
                <div class="engine-info-sep"></div>
                <div class="engine-info-item">
                  <span class="engine-info-k">{{ 'tl.compression' | t }}</span>
                  <span class="engine-info-v">{{ selEngine()!.compressionRatio || '—' }}</span>
                </div>
                <div class="engine-info-sep"></div>
                <div class="engine-info-item">
                  <span class="engine-info-k">{{ 'tl.fuel' | t }}</span>
                  <span class="engine-info-v">
                    <span class="fuel-badge fuel-badge--{{ fuelBadge(selEngine()!.fuel) }}">
                      {{ fuelLabel(selEngine()!.fuel) }}
                    </span>
                  </span>
                </div>
                <div class="engine-info-sep"></div>
                <div class="engine-info-item">
                  <span class="engine-info-k">ECU</span>
                  <span class="engine-info-v">{{ selEcu() || selEngine()!.ecu || '—' }}</span>
                </div>
              </div>
            }

            <!-- Eksik alan uyarısı — motor seçildi ama zorunlu alanlar eksik -->
            @if (selEngine() && !allFieldsFilled()) {
              <div class="fields-hint">
                <i class="pi pi-info-circle"></i>
                {{ 'tl.fillRequired' | t }}
                @if (!selEcu()) { <span class="fields-hint__tag">ECU</span> }
                @if (!selYear()) { <span class="fields-hint__tag">{{ 'tl.year' | t }}</span> }
                @if (!selTransmission()) { <span class="fields-hint__tag">{{ 'tl.transmission' | t }}</span> }
                @if (!selKm()) { <span class="fields-hint__tag">{{ 'tl.km' | t }}</span> }
                @if (!selPlate()) { <span class="fields-hint__tag">{{ 'tl.plate' | t }}</span> }
              </div>
            }

            <!-- HESAPLA — tüm alanlar dolu, henüz hesaplanmadıysa -->
            @if (allFieldsFilled() && !calculated()) {
              <div class="calc-cta">
                <button class="cta-btn cta-btn--primary" type="button" (click)="calculated.set(true)">
                  <i class="pi pi-calculator"></i> {{ 'tl.calculate' | t }}
                </button>
              </div>
            }

            @if (calculated()) {
              <div class="tune-opts">
                <p class="sel-label" style="margin-bottom:0.75rem">{{ 'tl.softwareLevel' | t }}</p>
                <div class="tune-opts__grid">
                  <!-- Stage 1 — aktif (DB verisi var) -->
                  <button
                    class="tune-opt" type="button"
                    [class.tune-opt--s1]="selTune() === 'stage1'"
                    (click)="selTune.set('stage1')"
                  >
                    <span class="tune-opt__head">
                      <span class="tune-opt__badge tune-opt__badge--blue">Stage 1</span>
                      @if (!pricesHidden()) { <span class="tune-opt__price">₺{{ tuningPriceMap()['stage1'] | number }}</span> }
                    </span>
                    <span class="tune-opt__desc">{{ 'tl.s1desc' | t }}</span>
                    <span class="tune-opt__gain">+{{ selEngine()!.stage1.hp - selEngine()!.stock.hp }} HP  /  +{{ selEngine()!.stage1.torque - selEngine()!.stock.torque }} Nm</span>
                  </button>

                  <!-- Stage 2 — veri varsa aktif, yoksa kilitli -->
                  @if (selEngine()!.stage2; as s2) {
                    <button
                      class="tune-opt" type="button"
                      [class.tune-opt--s2]="selTune() === 'stage2'"
                      (click)="selTune.set('stage2')"
                    >
                      <span class="tune-opt__head">
                        <span class="tune-opt__badge tune-opt__badge--red">Stage 2</span>
                        @if (!pricesHidden()) { <span class="tune-opt__price">₺{{ tuningPriceMap()['stage2'] | number }}</span> }
                      </span>
                      <span class="tune-opt__desc">{{ 'tl.s2desc' | t }}</span>
                      <span class="tune-opt__gain">+{{ s2.hp - selEngine()!.stock.hp }} HP  /  +{{ s2.torque - selEngine()!.stock.torque }} Nm</span>
                    </button>
                  } @else {
                    <button class="tune-opt tune-opt--locked" type="button" disabled aria-disabled="true">
                      <span class="tune-opt__head">
                        <span class="tune-opt__badge tune-opt__badge--red">Stage 2</span>
                        <i class="pi pi-lock tune-opt__lock"></i>
                      </span>
                      <span class="tune-opt__desc">{{ 'tl.contactForLevel' | t }}</span>
                      <span class="tune-opt__gain tune-opt__gain--muted">{{ 'tl.contact' | t }}</span>
                    </button>
                  }

                  <!-- Stage 3 — veri varsa aktif, yoksa kilitli -->
                  @if (selEngine()!.stage3; as s3) {
                    <button
                      class="tune-opt" type="button"
                      [class.tune-opt--s3]="selTune() === 'stage3'"
                      (click)="selTune.set('stage3')"
                    >
                      <span class="tune-opt__head">
                        <span class="tune-opt__badge tune-opt__badge--purple">Stage 3</span>
                        @if (!pricesHidden()) { <span class="tune-opt__price">₺{{ tuningPriceMap()['stage3'] | number }}</span> }
                      </span>
                      <span class="tune-opt__desc">{{ 'tl.s3desc' | t }}</span>
                      <span class="tune-opt__gain">+{{ s3.hp - selEngine()!.stock.hp }} HP  /  +{{ s3.torque - selEngine()!.stock.torque }} Nm</span>
                    </button>
                  } @else {
                    <button class="tune-opt tune-opt--locked" type="button" disabled aria-disabled="true">
                      <span class="tune-opt__head">
                        <span class="tune-opt__badge tune-opt__badge--purple">Stage 3</span>
                        <i class="pi pi-lock tune-opt__lock"></i>
                      </span>
                      <span class="tune-opt__desc">{{ 'tl.contactForLevel' | t }}</span>
                      <span class="tune-opt__gain tune-opt__gain--muted">{{ 'tl.contact' | t }}</span>
                    </button>
                  }
                </div>
              </div>
            }
          </div>

          <!-- RESULT + CHECKOUT — Hesapla'dan sonra -->
          @if (calculated() && tuningResult()) {
            <div class="checkout-layout">

              <!-- ── LEFT: result + steps ── -->
              <div class="checkout-steps">

            @if (orderSent()) {
              <div class="order-success-full">
                <div class="order-success-full__icon"><i class="pi pi-check-circle"></i></div>
                <h2 class="order-success-full__title">{{ 'tl.orderReceived' | t }}</h2>
                <div class="order-success-full__no">{{ orderNo() }}</div>
                <p class="order-success-full__desc">
                  {{ 'tl.t.success1' | t:{ tune: tuneLabel() } }}
                  @if (selectedModules().size > 0) { {{ 'tl.t.successModules' | t:{ n: selectedModules().size } }} }
                  {{ 'tl.t.success2' | t }}<br>
                  {{ 'tl.t.successEmail' | t }}
                </p>
                <div class="order-success-full__actions">
                  <a routerLink="/dashboard/orders" class="cta-btn cta-btn--primary" style="justify-content:center">
                    <i class="pi pi-list"></i> {{ 'tl.goToOrders' | t }}
                  </a>
                  <button class="cta-btn cta-btn--outline" (click)="resetOrder()" type="button" style="justify-content:center">
                    <i class="pi pi-plus"></i> {{ 'tl.newOrder' | t }}
                  </button>
                </div>
              </div>
            } @else {
            <div class="result-wrap">

              <div class="result-banner">
                <div class="result-banner__left">
                  <div class="result-badge">{{ selBrandName() }}</div>
                  <h2 class="result-banner__name">{{ selBrandName() }} {{ selModelName() }}</h2>
                  <p class="result-banner__meta">
                    <span class="result-banner__code">{{ tuningResult()!.engineNo || tuningResult()!.label }}</span>
                    · {{ engineDisp(tuningResult()!) }} · {{ fuelLabel(tuningResult()!.fuel) }} · {{ tuningResult()!.yearLabel || '—' }}
                  </p>
                </div>
                <div class="result-banner__tag">{{ tuneLabel() }}</div>
              </div>

              <!-- HP / NM CARDS -->
              <div class="power-row">
                <div class="power-block">
                  <span class="power-block__lbl">{{ 'tl.stock' | t }}</span>
                  <div class="power-block__vals">
                    <div class="power-val">
                      <span class="power-val__num">{{ tuningResult()!.stock.hp }}</span>
                      <span class="power-val__unit">HP</span>
                    </div>
                    <div class="power-val__sep"></div>
                    <div class="power-val">
                      <span class="power-val__num">{{ tuningResult()!.stock.torque }}</span>
                      <span class="power-val__unit">Nm</span>
                    </div>
                  </div>
                </div>
                <div class="power-arrow"><i class="pi pi-arrow-right"></i></div>
                <div class="power-block power-block--tuned">
                  <span class="power-block__lbl power-block__lbl--red">{{ tuneLabel() }}</span>
                  <div class="power-block__vals">
                    <div class="power-val">
                      <span class="power-val__num power-val__num--white">{{ tunedHp() }}</span>
                      <span class="power-val__unit">HP</span>
                      <span class="power-delta">+{{ tunedHp() - tuningResult()!.stock.hp }}</span>
                    </div>
                    <div class="power-val__sep"></div>
                    <div class="power-val">
                      <span class="power-val__num power-val__num--white">{{ tunedTorque() }}</span>
                      <span class="power-val__unit">Nm</span>
                      <span class="power-delta">+{{ tunedTorque() - tuningResult()!.stock.torque }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- SVG LINE CHARTS — side by side HP + Torque -->
              <div class="chart-grid">
                <!-- HP CHART -->
                <div class="line-chart-card">
                  <div class="line-chart-card__head">
                    <h3 class="gauge-card__title" style="margin:0">{{ 'tl.hpChart' | t }}</h3>
                    <div class="line-chart-legend">
                      <span class="lc-dot lc-dot--grey"></span><span>{{ 'tl.stock' | t }}</span>
                      <span class="lc-dot lc-dot--red"></span><span>{{ tuneLabel() }}</span>
                    </div>
                  </div>
                  @if (hpChart()) {
                    <svg [attr.viewBox]="'0 0 ' + hpChart()!.W + ' ' + hpChart()!.H" class="lc-svg" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="hpTunedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stop-color="#e63946" stop-opacity="0.3"></stop>
                          <stop offset="100%" stop-color="#e63946" stop-opacity="0.02"></stop>
                        </linearGradient>
                        <linearGradient id="hpStockGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.07"></stop>
                          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.01"></stop>
                        </linearGradient>
                      </defs>
                      @for (g of hpChart()!.gridY; track g.y) {
                        <line [attr.x1]="hpChart()!.padX" [attr.y1]="g.y" [attr.x2]="hpChart()!.W - 8" [attr.y2]="g.y" stroke="rgba(255,255,255,0.06)" stroke-width="1"></line>
                        <text [attr.x]="hpChart()!.padX - 6" [attr.y]="g.y + 4" text-anchor="end" fill="rgba(255,255,255,0.3)" font-size="10">{{ g.label }}</text>
                      }
                      @for (xl of hpChart()!.xLabels; track xl.label) {
                        <text [attr.x]="xl.x" [attr.y]="hpChart()!.H - 4" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="10">{{ xl.label }}</text>
                      }
                      <path [attr.d]="hpChart()!.stockArea" fill="url(#hpStockGrad)"></path>
                      <path [attr.d]="hpChart()!.tunedArea" fill="url(#hpTunedGrad)"></path>
                      <path [attr.d]="hpChart()!.stockPath" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                      <path [attr.d]="hpChart()!.tunedPath" fill="none" stroke="#e63946" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
                      <circle [attr.cx]="hpChart()!.stockPeak.x" [attr.cy]="hpChart()!.stockPeak.y" r="4" fill="#fff" fill-opacity="0.5"></circle>
                      <circle [attr.cx]="hpChart()!.tunedPeak.x" [attr.cy]="hpChart()!.tunedPeak.y" r="4.5" fill="#e63946"></circle>
                      <text [attr.x]="hpChart()!.tunedPeak.x - 6" [attr.y]="hpChart()!.tunedPeak.y - 10" text-anchor="end" fill="#e63946" font-size="11" font-weight="700">{{ tunedHp() }} HP</text>
                      <text [attr.x]="hpChart()!.stockPeak.x - 6" [attr.y]="hpChart()!.stockPeak.y - 8" text-anchor="end" fill="rgba(255,255,255,0.55)" font-size="10">{{ tuningResult()!.stock.hp }} HP</text>
                    </svg>
                  }
                </div>

                <!-- TORQUE CHART -->
                <div class="line-chart-card">
                  <div class="line-chart-card__head">
                    <h3 class="gauge-card__title" style="margin:0">{{ 'tl.torqueChart' | t }}</h3>
                    <div class="line-chart-legend">
                      <span class="lc-dot lc-dot--grey"></span><span>{{ 'tl.stock' | t }}</span>
                      <span class="lc-dot lc-dot--red"></span><span>{{ tuneLabel() }}</span>
                    </div>
                  </div>
                  @if (torqueChart()) {
                    <svg [attr.viewBox]="'0 0 ' + torqueChart()!.W + ' ' + torqueChart()!.H" class="lc-svg" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="tqTunedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.3"></stop>
                          <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.02"></stop>
                        </linearGradient>
                        <linearGradient id="tqStockGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.07"></stop>
                          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.01"></stop>
                        </linearGradient>
                      </defs>
                      @for (g of torqueChart()!.gridY; track g.y) {
                        <line [attr.x1]="torqueChart()!.padX" [attr.y1]="g.y" [attr.x2]="torqueChart()!.W - 8" [attr.y2]="g.y" stroke="rgba(255,255,255,0.06)" stroke-width="1"></line>
                        <text [attr.x]="torqueChart()!.padX - 6" [attr.y]="g.y + 4" text-anchor="end" fill="rgba(255,255,255,0.3)" font-size="10">{{ g.label }}</text>
                      }
                      @for (xl of torqueChart()!.xLabels; track xl.label) {
                        <text [attr.x]="xl.x" [attr.y]="torqueChart()!.H - 4" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="10">{{ xl.label }}</text>
                      }
                      <path [attr.d]="torqueChart()!.stockArea" fill="url(#tqStockGrad)"></path>
                      <path [attr.d]="torqueChart()!.tunedArea" fill="url(#tqTunedGrad)"></path>
                      <path [attr.d]="torqueChart()!.stockPath" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                      <path [attr.d]="torqueChart()!.tunedPath" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
                      <circle [attr.cx]="torqueChart()!.stockPeak.x" [attr.cy]="torqueChart()!.stockPeak.y" r="4" fill="#fff" fill-opacity="0.5"></circle>
                      <circle [attr.cx]="torqueChart()!.tunedPeak.x" [attr.cy]="torqueChart()!.tunedPeak.y" r="4.5" fill="#60a5fa"></circle>
                      <text [attr.x]="torqueChart()!.tunedPeak.x - 6" [attr.y]="torqueChart()!.tunedPeak.y - 10" text-anchor="end" fill="#60a5fa" font-size="11" font-weight="700">{{ tunedTorque() }} Nm</text>
                      <text [attr.x]="torqueChart()!.stockPeak.x - 6" [attr.y]="torqueChart()!.stockPeak.y - 8" text-anchor="end" fill="rgba(255,255,255,0.55)" font-size="10">{{ tuningResult()!.stock.torque }} Nm</text>
                    </svg>
                  }
                </div>
              </div>

              <!-- DETAIL GRID -->
              <div class="detail-card">
                <h3 class="gauge-card__title">{{ 'tl.techDetails' | t }}</h3>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-item__k">{{ 'tl.engineCode' | t }}</span>
                    <span class="detail-item__v detail-item__v--code">{{ tuningResult()!.engineNo || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-item__k">{{ 'tl.displacement' | t }}</span>
                    <span class="detail-item__v">{{ tuningResult()!.displacementCc ? (tuningResult()!.displacementCc | number) + ' cc' : '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-item__k">Bore × Stroke</span>
                    <span class="detail-item__v">{{ tuningResult()!.bore || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-item__k">{{ 'tl.compressionRatio' | t }}</span>
                    <span class="detail-item__v">{{ tuningResult()!.compressionRatio || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-item__k">{{ 'tl.fuelType' | t }}</span>
                    <span class="detail-item__v">
                      <span class="fuel-badge fuel-badge--{{ fuelBadge(tuningResult()!.fuel) }}">
                        {{ fuelLabel(tuningResult()!.fuel) }}
                      </span>
                    </span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-item__k">ECU</span>
                    <span class="detail-item__v">{{ selEcu() || tuningResult()!.ecu || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-item__k">{{ 'tl.prodYear' | t }}</span>
                    <span class="detail-item__v">{{ tuningResult()!.yearLabel || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-item__k">{{ 'tl.hpGain' | t }}</span>
                    <span class="detail-item__v detail-item__v--green">+{{ tunedHp() - tuningResult()!.stock.hp }} HP (%{{ hpPct() }})</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-item__k">{{ 'tl.torqueGain' | t }}</span>
                    <span class="detail-item__v detail-item__v--green">+{{ tunedTorque() - tuningResult()!.stock.torque }} Nm</span>
                  </div>
                </div>
              </div>

            </div><!-- /result-wrap -->
            }<!-- /@else orderSent -->

                <!-- ADIM KARTLARI — sipariş sonrası gizlenir -->
                @if (!orderSent()) {

                <!-- STEP 2 — AYARLAMA BİLGİLERİ -->
                <div class="step-card">
                  <div class="step-card__head">
                    <div class="step-num">2</div>
                    <div>
                      <h2 class="step-card__title">{{ 'tl.t.step2Title' | t }}</h2>
                      <p class="step-card__sub">{{ 'tl.t.step2Sub' | t }}</p>
                    </div>
                  </div>

                  <div class="vehicle-row">
                    <!-- Row 1: Okuma Aracı | Okuma Türü | VIN -->
                    <div class="sel-group">
                      <label class="sel-label" for="t-reading-tool">{{ 'tl.readingTool' | t }}</label>
                      <div class="sel-wrap">
                        <select id="t-reading-tool" class="sel" [(ngModel)]="selReadingToolVal" (ngModelChange)="selReadingTool.set($event)">
                          <option value="">{{ 'tl.select' | t }}</option>
                          @for (rt of readingToolOptions; track rt) {
                            <option [value]="rt">{{ rt }}</option>
                          }
                        </select>
                        <i class="pi pi-chevron-down sel-arrow"></i>
                      </div>
                    </div>
                    <div class="sel-group">
                      <label class="sel-label" for="t-virtual-file">{{ 'tl.readType' | t }}</label>
                      <div class="sel-wrap">
                        <select id="t-virtual-file" class="sel" [(ngModel)]="selVirtualFileVal" (ngModelChange)="selVirtualFile.set($event)">
                          <option value="">{{ 'tl.select' | t }}</option>
                          <option value="HAYIR">{{ 'tl.no' | t }}</option>
                          <option value="EVET">{{ 'tl.yes' | t }}</option>
                        </select>
                        <i class="pi pi-chevron-down sel-arrow"></i>
                      </div>
                    </div>
                    <div class="sel-group">
                      <label class="sel-label" for="t-vin">VIN</label>
                      <input id="t-vin" class="text-input" type="text" placeholder="WBA..." style="text-transform:uppercase"
                        [(ngModel)]="selVinVal" (ngModelChange)="selVin.set($event)" />
                    </div>
                    <!-- Row 2: ECU Donanım | ECU Parça | ECU Yazılım -->
                    <div class="sel-group">
                      <label class="sel-label" for="t-ecu-hw">{{ 'tl.ecuHw' | t }}</label>
                      <input id="t-ecu-hw" class="text-input" type="text" placeholder="0281…"
                        [(ngModel)]="selEcuHwVal" (ngModelChange)="selEcuHw.set($event)" />
                    </div>
                    <div class="sel-group">
                      <label class="sel-label" for="t-ecu-part">{{ 'tl.ecuPart' | t }}</label>
                      <input id="t-ecu-part" class="text-input" type="text" placeholder="03L…"
                        [(ngModel)]="selEcuPartVal" (ngModelChange)="selEcuPart.set($event)" />
                    </div>
                    <div class="sel-group">
                      <label class="sel-label" for="t-ecu-sw">{{ 'tl.ecuSw' | t }}</label>
                      <input id="t-ecu-sw" class="text-input" type="text" placeholder="8507…"
                        [(ngModel)]="selEcuSwVal" (ngModelChange)="selEcuSw.set($event)" />
                    </div>
                    <!-- Row 3: Dinamometrede -->
                    <div class="sel-group">
                      <label class="sel-label" for="t-dyno">{{ 'tl.dyno' | t }}</label>
                      <div class="sel-wrap">
                        <select id="t-dyno" class="sel" [(ngModel)]="selDynoVal" (ngModelChange)="selDyno.set($event)">
                          <option value="">{{ 'tl.select' | t }}</option>
                          <option value="HAYIR">{{ 'tl.no' | t }}</option>
                          <option value="EVET">{{ 'tl.yes' | t }}</option>
                        </select>
                        <i class="pi pi-chevron-down sel-arrow"></i>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- STEP 3 — PCODE VE NOT -->
                <div class="step-card">
                  <div class="step-card__head">
                    <div class="step-num">3</div>
                    <div>
                      <h2 class="step-card__title">{{ 'tl.t.step3Title' | t }}</h2>
                      <p class="step-card__sub">{{ 'tl.t.step3Sub' | t }}</p>
                    </div>
                    @if (entries().length > 0) {
                      <div class="step-card__actions">
                        <span class="entries-count">{{ 'tl.records' | t:{ n: entries().length } }}</span>
                      </div>
                    }
                  </div>

                  <!-- EKLE FORMU -->
                  <div class="entry-form">
                    <div class="entry-form__grid">
                      <div class="sel-group">
                        <label class="sel-label" for="t-pcode">Pcode</label>
                        <input id="t-pcode" class="text-input" type="text" placeholder="P0000…"
                          style="text-transform:uppercase"
                          [(ngModel)]="pcodeDraft" />
                      </div>
                      <div class="sel-group">
                        <label class="sel-label" for="t-note">{{ 'tl.note' | t }}</label>
                        <textarea id="t-note" class="text-area" rows="2" [placeholder]="'tl.notePh' | t"
                          [(ngModel)]="noteDraft"></textarea>
                      </div>
                    </div>
                    <button type="button" class="add-btn add-btn--block"
                      (click)="addEntry()" [disabled]="!pcodeDraft.trim() && !noteDraft.trim()">
                      <i class="pi pi-plus"></i> {{ 'tl.add' | t }}
                    </button>
                  </div>

                  <!-- EKLENEN KAYITLAR -->
                  @if (entries().length > 0) {
                    <div class="entry-list">
                      @for (e of entries(); track $index) {
                        <div class="entry-row">
                          <div class="entry-row__main">
                            @if (e.pcode) {
                              <span class="entry-row__pcode"><i class="pi pi-tag"></i>{{ e.pcode }}</span>
                            }
                            @if (e.note) {
                              <span class="entry-row__note">{{ e.note }}</span>
                            }
                          </div>
                          <button type="button" class="entry-row__x" (click)="removeEntry($index)" [attr.aria-label]="'tl.removeRecord' | t">
                            <i class="pi pi-trash"></i>
                          </button>
                        </div>
                      }
                    </div>
                  } @else {
                    <p class="multi-empty">{{ 'tl.noRecords' | t }}</p>
                  }
                </div>

                <!-- STEP 4 — DEĞİŞTİRİLMİŞ PARÇALAR -->
                <div class="step-card">
                  <div class="step-card__head">
                    <div class="step-num">4</div>
                    <div>
                      <h2 class="step-card__title">{{ 'tl.t.step4Title' | t }}</h2>
                      <p class="step-card__sub">{{ 'tl.t.step4Sub' | t }}</p>
                    </div>
                  </div>

                  <div class="mod-parts-section">
                    <div class="mod-parts-header">
                      <span class="sel-label">{{ 'tl.t.step4Title' | t }} <span class="optional-pill">{{ 'tl.optional' | t }}</span></span>
                      @if (selectedParts().size > 0) {
                        <span class="mod-parts-count">{{ 'tl.partsSelected' | t:{ n: selectedParts().size } }}</span>
                      }
                    </div>
                    <div class="mod-parts-grid">
                      @for (part of modifiedParts(); track part) {
                        <button type="button" class="mod-part-item" [class.mod-part-item--on]="isPartSelected(part)" (click)="togglePart(part)">
                          <span class="mod-part-check">@if (isPartSelected(part)) { <i class="pi pi-check"></i> }</span>
                          <span class="mod-part-label">{{ part }}</span>
                        </button>
                      }
                    </div>
                  </div>
                </div>

                <!-- STEP 5 — EKSTRA MODÜLLER -->
                <div class="step-card">
                  <div class="step-card__head">
                    <div class="step-num">5</div>
                    <div>
                      <h2 class="step-card__title">{{ 'tl.t.step5Title' | t }} <span class="optional-pill">{{ 'tl.optional' | t }}</span></h2>
                      <p class="step-card__sub">{{ 'tl.t.step5Sub' | t }}</p>
                    </div>
                    <div class="step-card__actions">
                      <button class="ghost-btn ghost-btn--danger" (click)="clearAll()" type="button" [disabled]="selectedModules().size === 0">{{ 'tl.clear' | t }}</button>
                    </div>
                  </div>
                  @for (group of groups(); track group) {
                    <div class="mod-group">
                      <h3 class="mod-group__title">{{ group }}</h3>
                      <div class="mod-grid">
                        @for (mod of modulesByGroup(group); track mod.code) {
                          <button class="mod-tile" [class.mod-tile--on]="isSelected(mod.code)" (click)="toggleModule(mod.code)" type="button">
                            <div class="mod-tile__top">
                              <span class="mod-tile__label">{{ mod.label }}</span>
                              <span class="mod-indicator" [class.mod-indicator--on]="isSelected(mod.code)">{{ isSelected(mod.code) ? 'ON' : 'OFF' }}</span>
                            </div>
                            <p class="mod-tile__desc">{{ mod.description }}</p>
                            @if (!pricesHidden()) { <span class="mod-tile__price">+{{ mod.price | number }}₺</span> }
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>

                <!-- STEP 6 — ECU DOSYASI -->
                <div class="step-card">
                  <div class="step-card__head">
                    <div class="step-num">6</div>
                    <div>
                      <h2 class="step-card__title">{{ 'tl.t.step6Title' | t }}</h2>
                      <p class="step-card__sub">{{ 'tl.t.step6Sub' | t }}</p>
                    </div>
                  </div>

                  <div
                    class="upload-zone"
                    [class.upload-zone--drag]="isDragging()"
                    [class.upload-zone--filled]="uploadedFile()"
                    (dragover)="onDragOver($event)"
                    (dragleave)="isDragging.set(false)"
                    (drop)="onDrop($event)"
                  >
                    @if (!uploadedFile()) {
                      <div class="upload-zone__inner">
                        <div class="upload-zone__icon"><i class="pi pi-cloud-upload"></i></div>
                        <p class="upload-zone__title">{{ 'tl.dragDrop' | t }}</p>
                        <p class="upload-zone__hint">{{ 'tl.formats' | t }}</p>
                        <label class="upload-zone__btn">
                          <i class="pi pi-folder-open"></i> {{ 'tl.selectFile' | t }}
                          <input type="file" accept=".bin,.ori,.hex,.mod,.kess,.ktag" (change)="onFileSelect($event)" style="display:none" />
                        </label>
                      </div>
                    } @else {
                      <div class="upload-file-info">
                        <div class="upload-file-info__icon"><i class="pi pi-file"></i></div>
                        <div class="upload-file-info__body">
                          <span class="upload-file-info__name">{{ uploadedFile()!.name }}</span>
                          <span class="upload-file-info__meta">{{ formatSize(uploadedFile()!.size) }} · {{ 'tl.ready' | t }}</span>
                        </div>
                        <button class="upload-file-info__remove" (click)="uploadedFile.set(null)" type="button"><i class="pi pi-times"></i></button>
                      </div>
                    }
                  </div>

                  <p class="upload-hint-note">
                    <i class="pi pi-info-circle"></i>
                    {{ 'tl.uploadHintNote' | t }}
                  </p>
                </div>

                }<!-- /@if !orderSent — adım kartları sonu -->

              </div><!-- /checkout-steps (dış) -->

              <!-- ── RIGHT: Sticky Summary Panel ── -->
              <div class="checkout-sidebar">
                <div class="cs">

                  <!-- Vehicle Header -->
                  <div class="cs__vehicle">
                    <div class="cs__vehicle-icon"><i class="pi pi-car"></i></div>
                    <div class="cs__vehicle-info">
                      <span class="cs__brand">{{ selBrandName() }}</span>
                      <span class="cs__model">{{ selModelName() }} · {{ selSeriesName() }}</span>
                    </div>
                  </div>

                  <div class="cs__divider"></div>

                  <!-- Stage line -->
                  <div class="cs__line">
                    <div class="cs__line-left">
                      <span class="cs__stage-badge cs__stage-badge--{{ selTune() }}">{{ tuneLabel() }}</span>
                      <span class="cs__line-desc">{{ 'tl.cs.tuningSoftware' | t }}</span>
                    </div>
                    @if (!pricesHidden()) { <span class="cs__line-price">₺{{ tuningPrice() | number }}</span> }
                  </div>

                  <!-- Engine specs mini -->
                  <div class="cs__engine-row">
                    <span class="cs__engine-chip">{{ tuningResult()!.engineNo || tuningResult()!.label }}</span>
                    <span class="cs__engine-chip">{{ tuningResult()!.displacementCc ? (tuningResult()!.displacementCc | number) + ' cc' : '—' }}</span>
                    <span class="cs__engine-chip cs__engine-chip--fuel">{{ fuelLabel(tuningResult()!.fuel) }}</span>
                  </div>

                  <!-- Power gain -->
                  <div class="cs__power">
                    <div class="cs__power-col">
                      <span class="cs__power-lbl">{{ 'tl.stock' | t }}</span>
                      <span class="cs__power-val">{{ tuningResult()!.stock.hp }} <em>HP</em></span>
                      <span class="cs__power-val">{{ tuningResult()!.stock.torque }} <em>Nm</em></span>
                    </div>
                    <i class="pi pi-arrow-right cs__power-arrow"></i>
                    <div class="cs__power-col cs__power-col--tuned">
                      <span class="cs__power-lbl">{{ tuneLabel() }}</span>
                      <span class="cs__power-val cs__power-val--white">{{ tunedHp() }} <em>HP</em>
                        <span class="cs__power-delta">+{{ tunedHp() - tuningResult()!.stock.hp }}</span>
                      </span>
                      <span class="cs__power-val cs__power-val--white">{{ tunedTorque() }} <em>Nm</em>
                        <span class="cs__power-delta">+{{ tunedTorque() - tuningResult()!.stock.torque }}</span>
                      </span>
                    </div>
                  </div>

                  <!-- Modules -->
                  @if (selectedModules().size > 0) {
                    <div class="cs__divider"></div>
                    <div class="cs__section-title">{{ 'tl.cs.extraModules' | t }}</div>
                    @for (code of selectedArray(); track code) {
                      <div class="cs__line cs__line--mod">
                        <div class="cs__line-left">
                          <i class="pi pi-check-circle cs__mod-icon"></i>
                          <span class="cs__line-desc">{{ labelOf(code) }}</span>
                        </div>
                        @if (!pricesHidden()) { <span class="cs__line-price cs__line-price--sm">+₺{{ modPrice(code) | number }}</span> }
                      </div>
                    }
                  }

                  <!-- Vehicle details filled -->
                  @if (selYear() || selEcu() || selTransmission() || selKm() || selPlate()) {
                    <div class="cs__divider"></div>
                    <div class="cs__section-title">{{ 'tl.cs.vehicleDetails' | t }}</div>
                    @if (selEcu()) {
                      <div class="cs__detail-row"><i class="pi pi-microchip"></i><span>{{ selEcu() }}</span></div>
                    }
                    @if (selYear()) {
                      <div class="cs__detail-row"><i class="pi pi-calendar"></i><span>{{ selYear() }}</span></div>
                    }
                    @if (selTransmission()) {
                      <div class="cs__detail-row"><i class="pi pi-cog"></i><span>{{ selTransmission() }}</span></div>
                    }
                    @if (selKm()) {
                      <div class="cs__detail-row"><i class="pi pi-gauge"></i><span>{{ selKm() | number }} km</span></div>
                    }
                    @if (selPlate()) {
                      <div class="cs__detail-row"><i class="pi pi-id-card"></i><span>{{ selPlate() }}</span></div>
                    }
                  }

                  <!-- Ayarlama Bilgileri -->
                  @if (selReadingTool() || selVirtualFile() || selVin() || selEcuHw() || selEcuPart() || selEcuSw() || selDyno()) {
                    <div class="cs__divider"></div>
                    <div class="cs__section-title">{{ 'tl.t.step2Title' | t }}</div>
                    @if (selReadingTool()) {
                      <div class="cs__detail-row"><i class="pi pi-database"></i><span>{{ selReadingTool() }}</span></div>
                    }
                    @if (selVirtualFile()) {
                      <div class="cs__detail-row"><i class="pi pi-file"></i><span>{{ 'tl.cs.virtualFile' | t }}: {{ selVirtualFile() }}</span></div>
                    }
                    @if (selVin()) {
                      <div class="cs__detail-row"><i class="pi pi-barcode"></i><span>VIN: {{ selVin() }}</span></div>
                    }
                    @if (selEcuHw()) {
                      <div class="cs__detail-row"><i class="pi pi-microchip"></i><span>HW: {{ selEcuHw() }}</span></div>
                    }
                    @if (selEcuPart()) {
                      <div class="cs__detail-row"><i class="pi pi-microchip"></i><span>Part: {{ selEcuPart() }}</span></div>
                    }
                    @if (selEcuSw()) {
                      <div class="cs__detail-row"><i class="pi pi-microchip"></i><span>SW: {{ selEcuSw() }}</span></div>
                    }
                    @if (selDyno()) {
                      <div class="cs__detail-row"><i class="pi pi-chart-line"></i><span>Dyno: {{ selDyno() }}</span></div>
                    }
                  }

                  <!-- Pcode & Not -->
                  @if (entries().length > 0) {
                    <div class="cs__divider"></div>
                    <div class="cs__section-title">{{ 'tl.cs.pcodeNote' | t }}</div>
                    @for (e of entries(); track $index) {
                      <div class="cs__detail-row">
                        <i class="pi pi-tag"></i>
                        <span>
                          @if (e.pcode) { <strong>{{ e.pcode }}</strong> }
                          @if (e.pcode && e.note) { · }
                          @if (e.note) { {{ e.note }} }
                        </span>
                      </div>
                    }
                  }

                  <!-- Modified parts (listed individually like modules) -->
                  @if (selectedParts().size > 0) {
                    <div class="cs__divider"></div>
                    <div class="cs__section-title">{{ 'tl.t.step4Title' | t }}</div>
                    @for (part of selectedPartsArray(); track part) {
                      <div class="cs__line cs__line--mod">
                        <div class="cs__line-left">
                          <i class="pi pi-wrench cs__mod-icon"></i>
                          <span class="cs__line-desc">{{ part }}</span>
                        </div>
                      </div>
                    }
                  }

                  <!-- File status -->
                  <div class="cs__divider"></div>
                  @if (uploadedFile()) {
                    <div class="cs__file cs__file--ok">
                      <i class="pi pi-check-circle"></i>
                      <div>
                        <span class="cs__file-name">{{ uploadedFile()!.name }}</span>
                        <span class="cs__file-size">{{ formatSize(uploadedFile()!.size) }}</span>
                      </div>
                    </div>
                  } @else {
                    <div class="cs__file cs__file--warn">
                      <i class="pi pi-exclamation-triangle"></i>
                      <span>{{ 'tl.fileNotUploaded' | t }}</span>
                    </div>
                  }

                  <!-- Total -->
                  @if (!pricesHidden()) {
                    <div class="cs__total">
                      <span class="cs__total-lbl">{{ 'tl.totalAmount' | t }}</span>
                      <span class="cs__total-val">₺{{ tuningGrandTotal() | number }}</span>
                    </div>
                  }

                  <!-- Ödeme bilgisi — role göre -->
                  @if (isDealer()) {
                    <div class="pay-note pay-note--dealer">
                      <i class="pi pi-calendar-clock"></i>
                      <div>
                        <span class="pay-note__title">{{ 'tl.dealerPayTitle' | t }}</span>
                        <span class="pay-note__text">{{ 'tl.dealerPayText' | t }}</span>
                      </div>
                    </div>
                  } @else {
                    <div class="pay-note pay-note--user">
                      <i class="pi pi-credit-card"></i>
                      <div>
                        <span class="pay-note__title">{{ 'tl.userPayTitle' | t }}</span>
                        <span class="pay-note__text">{{ 'tl.userPayText' | t }}</span>
                      </div>
                    </div>
                  }

                  <!-- Müşteri notu -->
                  @if (!orderSent()) {
                    <div class="cs__note">
                      <label class="cs__note-lbl" for="cs-order-note"><i class="pi pi-comment"></i> {{ 'tl.teamNote' | t }}</label>
                      <textarea id="cs-order-note" class="cs__note-input" rows="2" maxlength="1000"
                        [placeholder]="'tl.cs.notePh' | t"
                        [ngModel]="orderNote()" (ngModelChange)="orderNote.set($event)"></textarea>
                    </div>
                  }

                  <!-- CTA -->
                  @if (orderSent()) {
                    <!-- Sipariş alındı — sidebar da başarı gösterir -->
                    <div class="cs__sent">
                      <i class="pi pi-check-circle cs__sent__icon"></i>
                      <div>
                        <p class="cs__sent__title">{{ 'tl.orderReceived2' | t }}</p>
                        <p class="cs__sent__no">{{ orderNo() }}</p>
                      </div>
                    </div>
                    <div class="cs__actions">
                      <a routerLink="/dashboard/orders" class="cta-btn cta-btn--primary" style="width:100%; justify-content:center">
                        <i class="pi pi-list"></i> {{ 'tl.goToOrders' | t }}
                      </a>
                      <button class="cta-btn cta-btn--outline" (click)="resetOrder()" type="button" style="width:100%; justify-content:center">
                        <i class="pi pi-plus"></i> {{ 'tl.newOrder' | t }}
                      </button>
                    </div>
                  } @else {
                    <div class="cs__actions">
                      <button class="cta-btn cta-btn--primary" style="width:100%; justify-content:center"
                        type="button" [disabled]="!uploadedFile() || orderSubmitting()" (click)="submitOrder()">
                        <i class="pi" [class.pi-credit-card]="!isDealer() && !orderSubmitting()" [class.pi-check-circle]="isDealer() && !orderSubmitting()" [class.pi-spinner]="orderSubmitting()" [class.pi-spin]="orderSubmitting()"></i>
                        {{ orderSubmitting() ? ('tl.sending' | t) : orderCtaLabel() }}
                      </button>
                      <a href="/contact" class="cta-btn cta-btn--outline" style="width:100%; justify-content:center">
                        <i class="pi pi-headphones"></i> {{ 'tl.talkExpert' | t }}
                      </a>
                    </div>
                    @if (orderError()) {
                      <p class="cs__file-warn-note" style="color:#e63946"><i class="pi pi-exclamation-triangle"></i> {{ orderError() }}</p>
                    }
                    @if (!uploadedFile()) {
                      <p class="cs__file-warn-note">
                        <i class="pi pi-lock"></i> {{ 'tl.fileRequired' | t }}
                      </p>
                    }
                  }

                </div>
              </div><!-- /checkout-sidebar -->

            </div><!-- /checkout-layout -->
          }

        </div>
      }

    </div>
  `,
  styleUrl: './tools-page.scss',
})
export class ToolsPage implements OnInit {
  /* ─── AUTH / ROL ─── */
  private readonly auth = inject(AuthService);
  private readonly catalogApi = inject(CatalogService);
  private readonly ordersApi = inject(OrdersService);
  private readonly accountSvc = inject(AccountService);
  /**
   * withFetch() HTTP yanıtı Angular zone dışında çözülebildiği için, OnPush
   * altında async set'lerden sonra görünümü elle işaretliyoruz (aksi halde
   * dropdown'lar bir sonraki tıklamaya kadar boş görünüyor).
   */
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly i18n = inject(I18nService);
  /** Bayi mi? Ödeme akışı buna göre değişir (bayi = ay sonu hesabı, kullanıcı = anında ödeme). */
  protected readonly isDealer = this.auth.isDealer;
  /** Sipariş CTA etiketi role göre. */
  protected readonly orderCtaLabel = computed(() =>
    this.i18n.t(this.isDealer() ? 'tl.ctaConfirm' : 'tl.ctaPay'),
  );
  /** Bayilerde müşteri yanındayken fiyatları gizlemek için (layout'taki düğme kontrol eder). */
  protected readonly pricesHidden = inject(PrivacyService).pricesHidden;

  /* ─── TAB ─── */
  protected readonly activeTab = signal<TabKey>('tuning');

  /* ─── KATALOG (DB'den lazy-load) ─── */
  protected readonly brandsList   = signal<Brand[]>([]);
  protected readonly modelsList   = signal<Model[]>([]);
  protected readonly seriesList   = signal<Series[]>([]);
  protected readonly enginesList  = signal<Engine[]>([]);
  protected readonly servicesList = signal<Service[]>([]);
  protected readonly tuningPriceMap = signal<Record<string, number>>({});
  protected readonly catalogError = signal('');

  /** Modüller = servis kataloğunda kind = 'module' olanlar. */
  protected readonly modules = computed(() =>
    this.servicesList().filter(s => s.kind === 'module'),
  );
  /** Modüllerin ait olduğu kategoriler (sabit sıraya göre). */
  protected readonly groups = computed(() => {
    const present = new Set(this.modules().map(m => m.category));
    const ordered = GROUP_ORDER.filter(g => present.has(g));
    const extra = [...present].filter(g => !GROUP_ORDER.includes(g));
    return [...ordered, ...extra];
  });

  async ngOnInit(): Promise<void> {
    try {
      const [brands, services, prices, parts] = await Promise.all([
        this.catalogApi.listBrands(),
        this.catalogApi.listServices(),
        this.catalogApi.listTuningPrices(),
        this.catalogApi.listModifiedParts(),
      ]);
      this.brandsList.set(brands);
      this.servicesList.set(services);
      const map: Record<string, number> = {};
      for (const p of prices) { map[p.stage] = p.price; }
      this.tuningPriceMap.set(map);
      this.modifiedParts.set(parts.map(p => p.name));
    } catch {
      this.catalogError.set(this.i18n.t('tl.err.catalog'));
    } finally {
      this.cdr.markForCheck();
    }
  }

  /* ─── MODULE TAB STATE ─── */
  protected readonly brandsModule = BRANDS_MODULE;
  protected readonly modBrand   = signal('');
  protected readonly modEcu     = signal('');
  protected readonly autoId     = signal(false);
  protected readonly uploadedFile = signal<File | null>(null);
  protected readonly isDragging   = signal(false);
  protected readonly selectedModules = signal<Set<string>>(new Set());
  protected readonly orderSent = signal(false);
  protected readonly orderNo = signal('');
  protected readonly orderSubmitting = signal(false);
  protected readonly orderError = signal('');
  protected readonly orderNote = signal('');

  protected readonly availableEcus = computed(() => {
    const b = BRANDS_MODULE.find(x => x.label === this.modBrand());
    return b?.ecus ?? [];
  });

  protected readonly selectedArray = computed(() => [...this.selectedModules()]);
  protected readonly selectedPartsArray = computed(() => [...this.selectedParts()]);
  protected readonly totalPrice = computed(() =>
    [...this.selectedModules()].reduce((sum, code) => sum + this.modPrice(code), 0),
  );

  modulesByGroup(group: string): Service[] {
    return this.modules().filter(m => m.category === group);
  }
  isSelected(code: string): boolean {
    return this.selectedModules().has(code);
  }
  toggleModule(code: string): void {
    const s = new Set(this.selectedModules());
    if (s.has(code)) { s.delete(code); } else { s.add(code); }
    this.selectedModules.set(s);
  }
  selectAll(): void {
    this.selectedModules.set(new Set(this.modules().map(m => m.code)));
  }
  clearAll(): void {
    this.selectedModules.set(new Set());
  }
  labelOf(code: string): string {
    return this.modules().find(m => m.code === code)?.label ?? code;
  }
  modPrice(code: string): number {
    return this.modules().find(m => m.code === code)?.price ?? 0;
  }
  /** Sinyallerden sipariş yükünü kurar (Araçlar → Chip Tuning). */
  private buildOrderPayload(): CreateOrderPayload {
    return {
      stage: this.selTune(),
      engineId: this.selEngineId() || null,
      make: this.selBrandName(),
      model: [this.selModelName(), this.selSeriesName()].filter(Boolean).join(' '),
      year: this.selYear(),
      engineLabel: this.selEngine()?.label ?? '',
      fuel: this.selEngine()?.fuel ?? '',
      transmission: this.selTransmission(),
      vin: this.selVin(),
      km: this.selKm() == null ? '' : String(this.selKm()),
      plate: this.selPlate(),
      ecu: this.selEcu(),
      readingTool: this.selReadingTool(),
      virtualFile: this.selVirtualFile() === 'EVET',
      dyno: this.selDyno() === 'EVET',
      ecuHw: this.selEcuHw(),
      ecuPart: this.selEcuPart(),
      ecuSw: this.selEcuSw(),
      notes: this.orderNote().trim(),
      serviceCodes: [...this.selectedModules()],
      modifiedParts: [...this.selectedParts()],
      pcodes: this.entries().map(e => ({ pcode: e.pcode, note: e.note })),
    };
  }

  async submitOrder(): Promise<void> {
    if (this.orderSubmitting()) { return; }
    // Fatura bilgileri tanımlı değilse sipariş verilemez.
    if (!this.accountSvc.loaded()) { await this.accountSvc.load(); }
    if (!this.accountSvc.billingComplete()) {
      this.orderError.set(this.i18n.t('tl.err.billing'));
      return;
    }
    this.orderSubmitting.set(true);
    this.orderError.set('');
    try {
      const res = await this.ordersApi.createOrder(this.buildOrderPayload());
      const file = this.uploadedFile();
      if (file) {
        try { await this.ordersApi.uploadOriginalFile(res.id, file); }
        catch { /* dosya yüklenemese de sipariş oluştu — sessiz geç */ }
      }
      this.orderNo.set(res.orderNo);
      this.orderSent.set(true);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      this.orderError.set(
        `${this.i18n.t('tl.err.createOrder')}${status ? ` (kod: ${status})` : ''}`,
      );
    } finally {
      this.orderSubmitting.set(false);
      this.cdr.markForCheck();
    }
  }
  resetOrder(): void {
    this.selectedModules.set(new Set());
    this.orderSent.set(false);
    this.orderNo.set('');
    this.orderError.set('');
    this.orderNote.set('');
    this.uploadedFile.set(null);
    this.modBrand.set('');
    this.modEcu.set('');
    this.resetTuning();
  }
  onModBrand(ev: Event): void {
    this.modBrand.set((ev.target as HTMLSelectElement).value);
    this.modEcu.set('');
  }
  onModEcu(ev: Event): void {
    this.modEcu.set((ev.target as HTMLSelectElement).value);
  }
  onDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragging.set(true);
  }
  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragging.set(false);
    const file = ev.dataTransfer?.files?.[0];
    if (file) { this.uploadedFile.set(file); }
  }
  onFileSelect(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (file) { this.uploadedFile.set(file); }
  }
  formatSize(bytes: number): string {
    if (bytes < 1024) { return `${bytes} B`; }
    if (bytes < 1024 * 1024) { return `${(bytes / 1024).toFixed(1)} KB`; }
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  /* ─── TUNING TAB STATE ─── */
  protected readonly selBrandId   = signal('');
  protected readonly selModelId   = signal('');
  protected readonly selSeriesId  = signal('');
  protected readonly selEngineId  = signal('');
  protected readonly selTune      = signal<StageKey>('stage1');
  /** "Hesapla"ya basıldı mı? Sonuç bölümü yalnızca bundan sonra açılır. */
  protected readonly calculated   = signal(false);

  /* Seçili kayıtların gösterim adları (id → ad). */
  protected readonly selBrandName  = computed(() =>
    this.brandsList().find(b => b.id === this.selBrandId())?.name ?? '',
  );
  protected readonly selModelName  = computed(() =>
    this.modelsList().find(m => m.id === this.selModelId())?.name ?? '',
  );
  protected readonly selSeriesName = computed(() =>
    this.seriesList().find(s => s.id === this.selSeriesId())?.name ?? '',
  );

  /**
   * Sonuç ekranı tüm zorunlu alanlar dolduğunda otomatik açılır.
   * (Ayrı bir "Hesapla" adımı yok — seçim tamamlanınca türetilir.)
   */
  protected readonly tuningResult = computed<Engine | null>(() =>
    this.allFieldsFilled() ? this.selEngine() : null,
  );

  /* ─── ARAÇ DETAYLARI (müşteri giriyor) ─── */
  protected readonly selEcu           = signal('');
  protected readonly selYear          = signal('');
  protected readonly selTransmission  = signal('');
  protected readonly selKm            = signal('');
  protected readonly selPlate         = signal('');
  protected readonly selModifiedParts = signal('');

  protected readonly transmissionOptions = [
    'Manuel', 'Otomatik', 'DSG / S-Tronic', 'PDK', 'CVT', 'DCT / TCT',
  ];

  /**
   * Yıl seçenekleri seçili nesle göre türetilir:
   *  - year_from'dan başlar, year_to'da biter
   *  - year_to yoksa güncel yıla kadar
   *  - ikisi de yoksa tüm yıllar (1990 → güncel yıl)
   */
  protected readonly yearOptions = computed<string[]>(() => {
    const s = this.seriesList().find(x => x.id === this.selSeriesId());
    const current = new Date().getFullYear();
    const start = s?.yearFrom ?? 1990;
    const end = Math.max(start, s?.yearTo ?? current);
    const years: string[] = [];
    for (let y = start; y <= end; y++) { years.push(String(y)); }
    return years;
  });

  /* ECU seçenekleri — seçili motordan + markaya özel listeden + genel havuzdan. */
  protected readonly availableEcuOptions = computed<string[]>(() => {
    const engine = this.selEngine();
    if (!engine) { return []; }
    const opts = new Set<string>();
    if (engine.ecu) { opts.add(engine.ecu); }
    const brandName = this.selBrandName().toLowerCase();
    const brandEntry = BRANDS_MODULE.find(b =>
      b.label.toLowerCase().includes(brandName) ||
      (brandName && brandName.includes(b.label.split(' ')[0].toLowerCase())),
    );
    for (const ec of brandEntry?.ecus ?? []) { opts.add(ec); }
    if (opts.size === 0) { for (const ec of FALLBACK_ECUS) { opts.add(ec); } }
    return [...opts];
  });

  /* ─── AYARLAMA BİLGİLERİ ─── */
  protected readonly selReadingTool  = signal('');
  protected readonly selVirtualFile  = signal('');
  protected readonly selVin          = signal('');
  protected readonly selEcuHw        = signal('');
  protected readonly selEcuPart      = signal('');
  protected readonly selEcuSw        = signal('');
  protected readonly selDyno         = signal('');

  /* ─── PCODE & NOT (çoklu, pcode+not çifti) ─── */
  protected readonly entries = signal<PcodeNote[]>([]);
  protected pcodeDraft = '';
  protected noteDraft  = '';

  addEntry(): void {
    const pcode = this.pcodeDraft.trim().toUpperCase();
    const note  = this.noteDraft.trim();
    if (!pcode && !note) { return; }
    this.entries.update(list => [...list, { pcode, note }]);
    this.pcodeDraft = '';
    this.noteDraft  = '';
  }
  removeEntry(i: number): void {
    this.entries.update(list => list.filter((_, idx) => idx !== i));
  }

  protected readonly readingToolOptions = [
    'Flex OBD', 'KESS V2', 'KESS V3', 'KTAG', 'Magic Motorsport',
    'PCMFlash', 'AutoTuner', 'CMD Flash', 'ByteShooter', 'Alientech KESSv2',
  ];

  /* ngModel binding vars (two-way binding → signal sync) */
  protected selEcuVal          = '';
  protected selYearVal         = '';
  protected selTransmissionVal = '';
  protected selKmVal           = '';
  protected selPlateVal        = '';
  protected selReadingToolVal  = '';
  protected selVirtualFileVal  = '';
  protected selVinVal          = '';
  protected selEcuHwVal        = '';
  protected selEcuPartVal      = '';
  protected selEcuSwVal        = '';
  protected selDynoVal         = '';

  /* Değiştirilmiş parçalar — DB'den (modified_parts) yüklenir. */
  protected readonly modifiedParts = signal<string[]>([]);
  protected readonly selectedParts = signal<Set<string>>(new Set());

  togglePart(part: string): void {
    const s = new Set(this.selectedParts());
    if (s.has(part)) { s.delete(part); } else { s.add(part); }
    this.selectedParts.set(s);
    this.selModifiedParts.set([...s].join(', '));
  }
  isPartSelected(part: string): boolean {
    return this.selectedParts().has(part);
  }

  protected readonly selEngine = computed(() =>
    this.enginesList().find(e => e.id === this.selEngineId()) ?? null,
  );
  protected readonly allFieldsFilled = computed(() =>
    !!this.selEngineId() &&
    !!this.selEcu() &&
    !!this.selYear() &&
    !!this.selTransmission() &&
    !!this.selKm() &&
    !!this.selPlate()
  );

  protected readonly canCalculate = computed(() => this.allFieldsFilled());

  /**
   * Seçili stage'in güç noktası. Stage 2/3 verisi yoksa (kilitli) stage1'e düşer
   * — pratikte kilitli kart seçilemediği için bu durum oluşmaz.
   */
  private stagePower(e: Engine) {
    const t = this.selTune();
    if (t === 'stage2' && e.stage2) { return e.stage2; }
    if (t === 'stage3' && e.stage3) { return e.stage3; }
    return e.stage1;
  }

  protected readonly tunedHp = computed(() => {
    const e = this.tuningResult();
    return e ? this.stagePower(e).hp : 0;
  });
  protected readonly tunedTorque = computed(() => {
    const e = this.tuningResult();
    return e ? this.stagePower(e).torque : 0;
  });
  protected readonly tuneLabel = computed(() => {
    const map: Record<StageKey, string> = { stage1: 'Stage 1', stage2: 'Stage 2', stage3: 'Stage 3' };
    return map[this.selTune()];
  });
  protected readonly tuningPrice = computed(() =>
    this.tuningPriceMap()[this.selTune()] ?? 0,
  );
  protected readonly tuningGrandTotal = computed(() => this.tuningPrice() + this.totalPrice());
  protected readonly hpPct = computed(() => {
    const e = this.tuningResult();
    if (!e || !e.stock.hp) { return 0; }
    return Math.round(((this.tunedHp() - e.stock.hp) / e.stock.hp) * 100);
  });

  /* ─── YAKIT GÖSTERİMİ ─── */
  fuelLabel(f: FuelType): string {
    return this.i18n.t(`tl.fuel.${f}`);
  }
  fuelBadge(f: FuelType): 'petrol' | 'diesel' | 'hybrid' {
    if (f === 'diesel' || f === 'diesel_mhev' || f === 'diesel_phev' || f === 'diesel_hybrid') {
      return 'diesel';
    }
    if (f === 'petrol' || f === 'lpg') { return 'petrol'; }
    return 'hybrid'; // mhev/phev/hybrid/ev → vurgulu rozet
  }
  /** Silindir hacmi metni; displacement boşsa cc'den türetir. */
  engineDisp(e: Engine): string {
    if (e.displacement) { return e.displacement; }
    return e.displacementCc ? `${e.displacementCc} cc` : '—';
  }

  /** Devir bandı — dizel düşük, benzin yüksek devirli. */
  private revBand(fuel: FuelType): { min: number; max: number } {
    const diesel = fuel === 'diesel' || fuel === 'diesel_mhev'
      || fuel === 'diesel_phev' || fuel === 'diesel_hybrid';
    return diesel ? { min: 850, max: 5200 } : { min: 900, max: 7000 };
  }

  /**
   * Gerçekçi dyno eğrisi üretir.
   *  - Tork: orta devirde erken tepe yapar, geniş plato, redline'a doğru düşer.
   *  - Güç: tork × devir'den türetilir → daha geç tepe yapar ve redline'da düşer.
   * Böylece HP ve Tork grafikleri farklı, gerçek dyno gibi görünür.
   */
  private buildChart(
    stockMax: number, tunedMax: number,
    kind: 'power' | 'torque', rpmMin: number, rpmMax: number,
  ) {
    const W = 480; const H = 220; const padX = 44; const padY = 22; const botY = 26;
    const chartH = H - padY - botY;
    const chartW = W - padX - 8;

    // Tepe torkun oranı olarak tork faktörü (devir bandı boyunca).
    // Erken tepe (~%30 devir), tepe sonrası belirgin düşüş → uçlar aşağı iner.
    const torqueFactor = (x: number) => {
      const rise = 1 - Math.exp(-(x + 0.04) / 0.13);                     // rölantiden yükseliş
      const fall = 1 - 0.70 * Math.pow(Math.max(0, x - 0.30) / 0.70, 1.5); // tepe sonrası düşüş
      return rise * fall;
    };
    const rpmAt = (x: number) => rpmMin + x * (rpmMax - rpmMin);
    const shapeFn = kind === 'torque'
      ? torqueFactor
      : (x: number) => torqueFactor(x) * rpmAt(x); // güç ∝ tork × devir

    const N = 40;
    const xs: number[] = [];
    for (let i = 0; i <= N; i++) { xs.push(i / N); }
    const raw = xs.map(shapeFn);
    const rawMax = Math.max(...raw);
    const factor = raw.map(v => v / rawMax); // tepe = 1

    const yMax = (tunedMax || 1) * 1.08;
    const toX = (x: number) => padX + x * chartW;
    const toY = (v: number) => padY + chartH - (v / yMax) * chartH;
    // Catmull-Rom spline → doğal teğetler, dalgalanma yok (pürüzsüz dyno çizgisi).
    const makeBez = (pts: { x: number; y: number }[]) => {
      if (pts.length < 2) { return ''; }
      let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] ?? pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] ?? p2;
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      return d;
    };

    // Gerçek dyno gürültüsü — devire bağlı deterministik küçük dalgalar.
    // Yükle orantılı (faktörle çarpılır → rölantide küçük, tepede belirgin),
    // stock ve tuned farklı faz (seed) ile birbirinin kopyası görünmesin.
    const noise = (x: number, seed: number) =>
      Math.sin(x * 31 + seed * 1.7) * 0.009 +
      Math.sin(x * 17 + seed * 0.9 + 0.6) * 0.013 +
      Math.sin(x * 8  + seed * 1.3 + 1.1) * 0.011;
    const stockPts = xs.map((x, i) => ({ x: toX(x), y: toY(factor[i] * (1 + noise(x, 0)) * stockMax) }));
    const tunedPts = xs.map((x, i) => ({ x: toX(x), y: toY(factor[i] * (1 + noise(x, 1)) * tunedMax) }));
    const botLine  = `L ${toX(1).toFixed(1)} ${(H - botY).toFixed(1)} L ${toX(0).toFixed(1)} ${(H - botY).toFixed(1)} Z`;
    const stockPath = makeBez(stockPts);
    const tunedPath = makeBez(tunedPts);

    const gridSteps = [0, 0.25, 0.5, 0.75, 1.0];
    const gridY = gridSteps.map(p => ({ y: toY(p * yMax), label: p === 0 ? '' : `${Math.round(p * yMax)}` }));

    const ticks = 7;
    const xLabels = Array.from({ length: ticks }, (_, i) => {
      const x = i / (ticks - 1);
      return { x: toX(x), label: `${Math.round(rpmAt(x) / 100) * 100}` };
    });

    const peakIdx = factor.indexOf(Math.max(...factor));
    return {
      W, H, padX,
      stockPath, tunedPath,
      stockArea: stockPath + botLine,
      tunedArea: tunedPath + botLine,
      gridY, xLabels,
      stockPeak: stockPts[peakIdx],
      tunedPeak: tunedPts[peakIdx],
      stockVal: stockMax,
      tunedVal: tunedMax,
    };
  }

  protected readonly hpChart = computed(() => {
    const e = this.tuningResult();
    if (!e) { return null; }
    const b = this.revBand(e.fuel);
    return this.buildChart(e.stock.hp, this.tunedHp(), 'power', b.min, b.max);
  });

  protected readonly torqueChart = computed(() => {
    const e = this.tuningResult();
    if (!e) { return null; }
    const b = this.revBand(e.fuel);
    return this.buildChart(e.stock.torque, this.tunedTorque(), 'torque', b.min, b.max);
  });

  /* ─── CASCADE — marka → model → nesil → motor ─── */
  async onBrand(ev: Event): Promise<void> {
    const id = (ev.target as HTMLSelectElement).value;
    this.selBrandId.set(id);
    this.selModelId.set(''); this.selSeriesId.set(''); this.selEngineId.set('');
    this.modelsList.set([]); this.seriesList.set([]); this.enginesList.set([]);
    this.clearEcu();
    this.clearAfterEcu();
    this.selTune.set('stage1');
    if (id) {
      try { this.modelsList.set(await this.catalogApi.listModels(id)); }
      catch { this.catalogError.set(this.i18n.t('tl.err.models')); }
      finally { this.cdr.markForCheck(); }
    }
  }
  async onModel(ev: Event): Promise<void> {
    const id = (ev.target as HTMLSelectElement).value;
    this.selModelId.set(id);
    this.selSeriesId.set(''); this.selEngineId.set('');
    this.seriesList.set([]); this.enginesList.set([]);
    this.clearEcu();
    this.clearAfterEcu();
    this.selTune.set('stage1');
    if (id) {
      try { this.seriesList.set(await this.catalogApi.listSeries(id)); }
      catch { this.catalogError.set(this.i18n.t('tl.err.series')); }
      finally { this.cdr.markForCheck(); }
    }
  }
  async onSeries(ev: Event): Promise<void> {
    const id = (ev.target as HTMLSelectElement).value;
    this.selSeriesId.set(id);
    this.selEngineId.set('');
    this.enginesList.set([]);
    this.clearEcu();
    // Yıl aralığı nesle bağlı + sıralı akış: alt alanları sıfırla.
    this.clearAfterEcu();
    this.selTune.set('stage1');
    if (id) {
      try { this.enginesList.set(await this.catalogApi.listEnginesDetailed(id)); }
      catch { this.catalogError.set(this.i18n.t('tl.err.engines')); }
      finally { this.cdr.markForCheck(); }
    }
  }
  onEngine(ev: Event): void {
    const id = (ev.target as HTMLSelectElement).value;
    this.selEngineId.set(id);
    this.selTune.set('stage1');
    const engine = this.enginesList().find(e => e.id === id);
    // ECU'yu motordan otomatik doldur (veride varsa); yoksa kullanıcı seçsin.
    const ecu = engine?.ecu ?? '';
    this.selEcuVal = ecu;
    this.selEcu.set(ecu);
    // Motor değişti → sonraki sıralı alanları sıfırla.
    this.clearAfterEcu();
  }

  private clearEcu(): void {
    this.selEcuVal = '';
    this.selEcu.set('');
  }

  /** Sıralı akışta ECU sonrası alanlar (yıl, şanzıman, km, plaka). */
  private clearAfterEcu(): void {
    this.selYear.set('');         this.selYearVal = '';
    this.selTransmission.set(''); this.selTransmissionVal = '';
    this.selKm.set('');           this.selKmVal = '';
    this.selPlate.set('');        this.selPlateVal = '';
    this.calculated.set(false);
  }

  /** Chip tuning sekmesindeki tüm seçim/giriş durumunu sıfırlar. */
  private resetTuning(): void {
    this.selBrandId.set('');
    this.selModelId.set('');
    this.selSeriesId.set('');
    this.selEngineId.set('');
    this.modelsList.set([]);
    this.seriesList.set([]);
    this.enginesList.set([]);
    this.selTune.set('stage1');
    this.calculated.set(false);
    this.selEcu.set('');          this.selEcuVal = '';
    this.selYear.set('');         this.selYearVal = '';
    this.selTransmission.set(''); this.selTransmissionVal = '';
    this.selKm.set('');           this.selKmVal = '';
    this.selPlate.set('');        this.selPlateVal = '';
    this.selModifiedParts.set('');
    this.selReadingTool.set('');  this.selReadingToolVal = '';
    this.selVirtualFile.set('');  this.selVirtualFileVal = '';
    this.selVin.set('');          this.selVinVal = '';
    this.selEcuHw.set('');        this.selEcuHwVal = '';
    this.selEcuPart.set('');      this.selEcuPartVal = '';
    this.selEcuSw.set('');        this.selEcuSwVal = '';
    this.selDyno.set('');         this.selDynoVal = '';
    this.entries.set([]);
    this.pcodeDraft = '';
    this.noteDraft  = '';
    this.selectedParts.set(new Set());
  }

  resetAll(): void {
    this.resetTuning();
    this.selectedModules.set(new Set());
    this.uploadedFile.set(null);
    this.orderSent.set(false);
  }
}
