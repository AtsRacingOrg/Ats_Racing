import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

/* ─── TYPES ─────────────────────────────────────────── */
type TabKey = 'module' | 'tuning';

interface DpfModule {
  key: string;
  label: string;
  desc: string;
  price: number;
  group: string;
}

interface Engine {
  label: string;
  stock: { hp: number; torque: number };
  stage1: { hp: number; torque: number };
  stage2: { hp: number; torque: number };
  displacement: string;
  ecu: string;
  fuel: string;
  year: string;
}
interface CarSeries { label: string; engines: Engine[]; }
interface CarModel   { label: string; series: CarSeries[]; }
interface Brand      { label: string; models: CarModel[]; }

/* ─── MODULES CATALOG ───────────────────────────────── */
const MODULES: DpfModule[] = [
  { key: 'dpf',     label: 'DPF',                  desc: 'Partikül filtre devre dışı',       price: 350,  group: 'Emisyon' },
  { key: 'egr',     label: 'EGR',                  desc: 'Egzoz gazı geri devir iptali',     price: 250,  group: 'Emisyon' },
  { key: 'adblue',  label: 'Adblue / SCR',         desc: 'Üre sistemi devre dışı',           price: 400,  group: 'Emisyon' },
  { key: 'lambda',  label: 'Lambda',               desc: 'O2 sensör iptali',                 price: 200,  group: 'Emisyon' },
  { key: 'nox',     label: 'NOX',                  desc: 'NOx sensör devre dışı',            price: 200,  group: 'Emisyon' },
  { key: 'flaps',   label: 'Flaps / Swirl',        desc: 'Emme kapak aktüatör iptali',       price: 180,  group: 'Motor' },
  { key: 'immo',    label: 'Immo Off (FLASH)',      desc: 'İmmobilizer flash ile kaldırma',   price: 500,  group: 'Güvenlik' },
  { key: 'ready',   label: 'Readiness Calibration',desc: 'OBD hazırlık kalibrasyonu',        price: 150,  group: 'Motor' },
  { key: 'rpm',     label: 'RPM Soft Limiter',     desc: 'Yumuşak devir sınırı kaldırma',    price: 200,  group: 'Performans' },
  { key: 'startstop', label: 'Start-Stop',         desc: 'Otomatik stop sistemi iptali',     price: 150,  group: 'Konfor' },
  { key: 'torque',  label: 'Torque Monitor',       desc: 'Tork monitör devre dışı',          price: 120,  group: 'Performans' },
  { key: 'tva',     label: 'TVA',                  desc: 'Gaz kelebeği aktüatör iptali',     price: 180,  group: 'Motor' },
  { key: 'vmax',    label: 'VMAX',                 desc: 'Hız sınırı kaldırma',              price: 250,  group: 'Performans' },
  { key: 'waterpump', label: 'Water Pump',         desc: 'Su pompası PWM kontrolü',          price: 120,  group: 'Motor' },
];

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

/* ─── TUNING CATALOG ────────────────────────────────── */
const CATALOG: Brand[] = [
  { label: 'BMW', models: [
    { label: 'M3', series: [
      { label: 'F80 (2014–2018)', engines: [
        { label: 'S55B30 3.0T', stock: { hp: 431, torque: 550 }, stage1: { hp: 500, torque: 620 }, stage2: { hp: 560, torque: 680 }, displacement: '3.0L Twin Turbo', ecu: 'Bosch MG1CS001', fuel: 'Benzin', year: '2014–2018' },
      ]},
      { label: 'G80 (2021–)', engines: [
        { label: 'S58B30 3.0T', stock: { hp: 510, torque: 650 }, stage1: { hp: 580, torque: 730 }, stage2: { hp: 650, torque: 820 }, displacement: '3.0L Twin Turbo', ecu: 'Bosch MG1CS024', fuel: 'Benzin', year: '2021–' },
      ]},
    ]},
    { label: 'M5', series: [
      { label: 'F90 (2018–)', engines: [
        { label: 'S63B44 4.4T', stock: { hp: 600, torque: 750 }, stage1: { hp: 680, torque: 840 }, stage2: { hp: 750, torque: 920 }, displacement: '4.4L V8 TT', ecu: 'Bosch MED17', fuel: 'Benzin', year: '2018–' },
      ]},
    ]},
  ]},
  { label: 'Audi', models: [
    { label: 'RS6', series: [
      { label: 'C8 (2020–)', engines: [
        { label: 'DKCE 4.0 TFSI', stock: { hp: 600, torque: 800 }, stage1: { hp: 680, torque: 880 }, stage2: { hp: 760, torque: 960 }, displacement: '4.0L V8 TT', ecu: 'Bosch MG1', fuel: 'Benzin', year: '2020–' },
      ]},
    ]},
    { label: 'S3', series: [
      { label: '8Y (2021–)', engines: [
        { label: 'DKZ 2.0 TFSI', stock: { hp: 310, torque: 400 }, stage1: { hp: 370, torque: 470 }, stage2: { hp: 430, torque: 530 }, displacement: '2.0L Turbo', ecu: 'Bosch MG1CS011', fuel: 'Benzin', year: '2021–' },
      ]},
    ]},
  ]},
  { label: 'Mercedes', models: [
    { label: 'C63 AMG', series: [
      { label: 'W205 (2015–2021)', engines: [
        { label: 'M177 4.0T', stock: { hp: 476, torque: 650 }, stage1: { hp: 560, torque: 730 }, stage2: { hp: 630, torque: 810 }, displacement: '4.0L V8 TT', ecu: 'Bosch MED17', fuel: 'Benzin', year: '2015–2021' },
      ]},
    ]},
  ]},
  { label: 'VW', models: [
    { label: 'Golf R', series: [
      { label: 'Mk8 (2021–)', engines: [
        { label: 'DKZ 2.0 TSI', stock: { hp: 320, torque: 420 }, stage1: { hp: 380, torque: 490 }, stage2: { hp: 440, torque: 560 }, displacement: '2.0L Turbo', ecu: 'Bosch MG1CS011', fuel: 'Benzin', year: '2021–' },
      ]},
    ]},
  ]},
  { label: 'Porsche', models: [
    { label: '911', series: [
      { label: 'Turbo S 992 (2021–)', engines: [
        { label: '9A2.51 3.8T', stock: { hp: 650, torque: 800 }, stage1: { hp: 730, torque: 890 }, stage2: { hp: 820, torque: 980 }, displacement: '3.8L Flat-6 TT', ecu: 'Bosch ME9.8', fuel: 'Benzin', year: '2021–' },
      ]},
    ]},
  ]},
];

const GROUPS = ['Emisyon', 'Motor', 'Performans', 'Konfor', 'Güvenlik'];

@Component({
  selector: 'app-tools-page',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tp">

      <!-- PAGE HEADER -->
      <div class="tp__header">
        <h1 class="tp__title">Yazılım Araçları</h1>
        <p class="tp__sub">Modül yazılımı siparişi verin veya chip tuning kazanımınızı hesaplayın</p>
      </div>

      <!-- TAB BAR -->
      <div class="tab-bar" role="tablist">
        <button
          class="tab-btn"
          [class.tab-btn--active]="activeTab() === 'module'"
          (click)="activeTab.set('module')"
          role="tab"
          [attr.aria-selected]="activeTab() === 'module'"
        >
          <i class="pi pi-sliders-v"></i> Modüller
        </button>
        <button
          class="tab-btn"
          [class.tab-btn--active]="activeTab() === 'tuning'"
          (click)="activeTab.set('tuning')"
          role="tab"
          [attr.aria-selected]="activeTab() === 'tuning'"
        >
          <i class="pi pi-bolt"></i> Chip Tuning
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
                <h2 class="step-card__title">Araç & Dosya Bilgisi</h2>
                <p class="step-card__sub">Marka ve ECU seçin, ardından orijinal yazılım dosyanızı yükleyin</p>
              </div>
            </div>

            <div class="vehicle-row">
              <div class="sel-group">
                <label class="sel-label" for="mod-brand">Marka</label>
                <div class="sel-wrap">
                  <select id="mod-brand" class="sel" (change)="onModBrand($event)">
                    <option value="">— Marka seçin —</option>
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
                    <option value="">— ECU seçin —</option>
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
                  <p class="upload-zone__title">Orijinal ECU Dosyasını Sürükle & Bırak</p>
                  <p class="upload-zone__hint">.bin · .ori · .hex · .kess · .ktag formatları desteklenir</p>
                  <label class="upload-zone__btn">
                    <i class="pi pi-folder-open"></i> Dosya Seç
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
                    <span class="upload-file-info__meta">{{ formatSize(uploadedFile()!.size) }} · Hazır</span>
                  </div>
                  <button class="upload-file-info__remove" (click)="uploadedFile.set(null)" type="button" aria-label="Dosyayı kaldır">
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
                <h2 class="step-card__title">Modül Seçimi</h2>
                <p class="step-card__sub">İstediğiniz yazılım modüllerini aktif edin</p>
              </div>
              <div class="step-card__actions">
                <button class="ghost-btn" (click)="selectAll()" type="button">Tümünü Seç</button>
                <button class="ghost-btn ghost-btn--danger" (click)="clearAll()" type="button">Temizle</button>
              </div>
            </div>

            @for (group of groups; track group) {
              <div class="mod-group">
                <h3 class="mod-group__title">{{ group }}</h3>
                <div class="mod-grid">
                  @for (mod of modulesByGroup(group); track mod.key) {
                    <button
                      class="mod-tile"
                      [class.mod-tile--on]="isSelected(mod.key)"
                      (click)="toggleModule(mod.key)"
                      type="button"
                    >
                      <div class="mod-tile__top">
                        <span class="mod-tile__label">{{ mod.label }}</span>
                        <span class="mod-indicator" [class.mod-indicator--on]="isSelected(mod.key)">
                          {{ isSelected(mod.key) ? 'ON' : 'OFF' }}
                        </span>
                      </div>
                      <p class="mod-tile__desc">{{ mod.desc }}</p>
                      <span class="mod-tile__price">+{{ mod.price | number }}₺</span>
                    </button>
                  }
                </div>
              </div>
            }
          </div>

          <!-- SUMMARY + CTA -->
          @if (selectedModules().size > 0) {
            <div class="order-summary">
              <div class="order-summary__left">
                <span class="order-summary__count">{{ selectedModules().size }} modül seçildi</span>
                <div class="order-summary__chips">
                  @for (key of selectedArray(); track key) {
                    <span class="order-chip">{{ labelOf(key) }}</span>
                  }
                </div>
              </div>
              <div class="order-summary__right">
                <div class="order-summary__total">
                  <span class="order-summary__total-lbl">Toplam</span>
                  <span class="order-summary__total-val">{{ totalPrice() | number }}₺</span>
                </div>
                <button class="cta-btn cta-btn--primary" type="button" (click)="submitOrder()">
                  <i class="pi pi-send"></i>
                  Sipariş Ver
                </button>
              </div>
            </div>
          }

          <!-- ORDER SUCCESS -->
          @if (orderSent()) {
            <div class="order-success">
              <div class="order-success__icon"><i class="pi pi-check-circle"></i></div>
              <div class="order-success__body">
                <h3>Siparişiniz Alındı!</h3>
                <p>{{ selectedModules().size }} modüllü yazılım talebiniz ekibimize iletildi. En kısa sürede dönüş yapılacaktır.</p>
              </div>
              <button class="ghost-btn" (click)="resetOrder()" type="button">Yeni Sipariş</button>
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
                <h2 class="step-card__title">Araç Seçimi</h2>
                <p class="step-card__sub">Aracınızı seçin ve yazılım seviyesini belirleyin</p>
              </div>
            </div>

            <div class="vehicle-row">
              <div class="sel-group">
                <label class="sel-label" for="t-brand">Marka</label>
                <div class="sel-wrap">
                  <select id="t-brand" class="sel" (change)="onBrand($event)">
                    <option value="">— Marka —</option>
                    @for (b of catalog; track b.label) {
                      <option [value]="b.label">{{ b.label }}</option>
                    }
                  </select>
                  <i class="pi pi-chevron-down sel-arrow"></i>
                </div>
              </div>
              <div class="sel-group">
                <label class="sel-label" for="t-model">Model</label>
                <div class="sel-wrap">
                  <select id="t-model" class="sel" [disabled]="!selBrand()" (change)="onModel($event)">
                    <option value="">— Model —</option>
                    @for (m of availableModels(); track m.label) {
                      <option [value]="m.label">{{ m.label }}</option>
                    }
                  </select>
                  <i class="pi pi-chevron-down sel-arrow"></i>
                </div>
              </div>
              <div class="sel-group">
                <label class="sel-label" for="t-series">Seri / Yıl</label>
                <div class="sel-wrap">
                  <select id="t-series" class="sel" [disabled]="!selModel()" (change)="onSeries($event)">
                    <option value="">— Seri —</option>
                    @for (s of availableSeries(); track s.label) {
                      <option [value]="s.label">{{ s.label }}</option>
                    }
                  </select>
                  <i class="pi pi-chevron-down sel-arrow"></i>
                </div>
              </div>
              <div class="sel-group">
                <label class="sel-label" for="t-engine">Motor</label>
                <div class="sel-wrap">
                  <select id="t-engine" class="sel" [disabled]="!selSeries()" (change)="onEngine($event)">
                    <option value="">— Motor —</option>
                    @for (e of availableEngines(); track e.label) {
                      <option [value]="e.label">{{ e.label }}</option>
                    }
                  </select>
                  <i class="pi pi-chevron-down sel-arrow"></i>
                </div>
              </div>
            </div>

            @if (selEngine()) {
              <div class="tune-opts">
                <p class="sel-label" style="margin-bottom:0.75rem">Yazılım Seviyesi</p>
                <div class="tune-opts__grid">
                  <button
                    class="tune-opt" type="button"
                    [class.tune-opt--s1]="selTune() === 'stage1'"
                    (click)="selTune.set('stage1')"
                  >
                    <span class="tune-opt__badge tune-opt__badge--blue">Stage 1</span>
                    <span class="tune-opt__desc">Sadece yazılım — ek donanım gerektirmez</span>
                    <span class="tune-opt__gain">+{{ selEngine()!.stage1.hp - selEngine()!.stock.hp }} HP  /  +{{ selEngine()!.stage1.torque - selEngine()!.stock.torque }} Nm</span>
                  </button>
                  <button
                    class="tune-opt" type="button"
                    [class.tune-opt--s2]="selTune() === 'stage2'"
                    (click)="selTune.set('stage2')"
                  >
                    <span class="tune-opt__badge tune-opt__badge--red">Stage 2</span>
                    <span class="tune-opt__desc">Downpipe + intercooler ile maksimum kazanım</span>
                    <span class="tune-opt__gain">+{{ selEngine()!.stage2.hp - selEngine()!.stock.hp }} HP  /  +{{ selEngine()!.stage2.torque - selEngine()!.stock.torque }} Nm</span>
                  </button>
                </div>
              </div>
            }

            <button
              class="cta-btn cta-btn--primary"
              style="margin-top:1.5rem; width:fit-content"
              type="button"
              [disabled]="!canCalculate()"
              (click)="calculate()"
            >
              <i class="pi pi-bolt"></i> Hesapla
            </button>
          </div>

          <!-- RESULT -->
          @if (tuningResult()) {
            <div class="result-wrap">

              <div class="result-banner">
                <div class="result-banner__left">
                  <div class="result-badge">{{ selBrand() }}</div>
                  <h2 class="result-banner__name">{{ selBrand() }} {{ selModel() }}</h2>
                  <p class="result-banner__meta">
                    {{ tuningResult()!.displacement }} · {{ tuningResult()!.ecu }} · {{ tuningResult()!.fuel }} · {{ tuningResult()!.year }}
                  </p>
                </div>
                <div class="result-banner__tag">{{ selTune() === 'stage1' ? 'Stage 1' : 'Stage 2' }}</div>
              </div>

              <!-- HP / NM CARDS -->
              <div class="power-row">
                <div class="power-block">
                  <span class="power-block__lbl">Orjinal</span>
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
                  <span class="power-block__lbl power-block__lbl--red">{{ selTune() === 'stage1' ? 'Stage 1' : 'Stage 2' }}</span>
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
                    <h3 class="gauge-card__title" style="margin:0">Beygir Gücü (HP)</h3>
                    <div class="line-chart-legend">
                      <span class="lc-dot lc-dot--grey"></span><span>Orjinal</span>
                      <span class="lc-dot lc-dot--red"></span><span>{{ selTune() === 'stage1' ? 'Stage 1' : 'Stage 2' }}</span>
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
                    <h3 class="gauge-card__title" style="margin:0">Tork (Nm)</h3>
                    <div class="line-chart-legend">
                      <span class="lc-dot lc-dot--grey"></span><span>Orjinal</span>
                      <span class="lc-dot lc-dot--red"></span><span>{{ selTune() === 'stage1' ? 'Stage 1' : 'Stage 2' }}</span>
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
                <h3 class="gauge-card__title">Teknik Detaylar</h3>
                <div class="detail-grid">
                  <div class="detail-item"><span class="detail-item__k">Motor Hacmi</span><span class="detail-item__v">{{ tuningResult()!.displacement }}</span></div>
                  <div class="detail-item"><span class="detail-item__k">ECU</span><span class="detail-item__v">{{ tuningResult()!.ecu }}</span></div>
                  <div class="detail-item"><span class="detail-item__k">Yakıt</span><span class="detail-item__v">{{ tuningResult()!.fuel }}</span></div>
                  <div class="detail-item"><span class="detail-item__k">Üretim Yılı</span><span class="detail-item__v">{{ tuningResult()!.year }}</span></div>
                  <div class="detail-item"><span class="detail-item__k">HP Artışı</span><span class="detail-item__v detail-item__v--green">+{{ tunedHp() - tuningResult()!.stock.hp }} HP (%{{ hpPct() }})</span></div>
                  <div class="detail-item"><span class="detail-item__k">Tork Artışı</span><span class="detail-item__v detail-item__v--green">+{{ tunedTorque() - tuningResult()!.stock.torque }} Nm</span></div>
                </div>
              </div>

              <div class="result-cta">
                <button class="cta-btn cta-btn--primary" type="button">
                  <i class="pi pi-shopping-cart"></i> Yazılım Satın Al
                </button>
                <a href="/contact" class="cta-btn cta-btn--outline">
                  <i class="pi pi-headphones"></i> Uzmanla Konuş
                </a>
              </div>

            </div>
          }

        </div>
      }

    </div>
  `,
  styleUrl: './tools-page.scss',
})
export class ToolsPage {
  /* ─── TAB ─── */
  protected readonly activeTab = signal<TabKey>('module');

  /* ─── MODULE TAB STATE ─── */
  protected readonly brandsModule = BRANDS_MODULE;
  protected readonly groups = GROUPS;
  protected readonly allModules = MODULES;
  protected readonly modBrand   = signal('');
  protected readonly modEcu     = signal('');
  protected readonly autoId     = signal(false);
  protected readonly uploadedFile = signal<File | null>(null);
  protected readonly isDragging   = signal(false);
  protected readonly selectedModules = signal<Set<string>>(new Set());
  protected readonly orderSent = signal(false);

  protected readonly availableEcus = computed(() => {
    const b = BRANDS_MODULE.find(x => x.label === this.modBrand());
    return b?.ecus ?? [];
  });

  protected readonly selectedArray = computed(() => [...this.selectedModules()]);
  protected readonly totalPrice = computed(() =>
    [...this.selectedModules()].reduce((sum, key) => {
      const mod = MODULES.find(m => m.key === key);
      return sum + (mod?.price ?? 0);
    }, 0)
  );

  modulesByGroup(group: string): DpfModule[] {
    return this.allModules.filter(m => m.group === group);
  }
  isSelected(key: string): boolean {
    return this.selectedModules().has(key);
  }
  toggleModule(key: string): void {
    const s = new Set(this.selectedModules());
    if (s.has(key)) { s.delete(key); } else { s.add(key); }
    this.selectedModules.set(s);
  }
  selectAll(): void {
    this.selectedModules.set(new Set(MODULES.map(m => m.key)));
  }
  clearAll(): void {
    this.selectedModules.set(new Set());
  }
  labelOf(key: string): string {
    return MODULES.find(m => m.key === key)?.label ?? key;
  }
  submitOrder(): void {
    this.orderSent.set(true);
  }
  resetOrder(): void {
    this.selectedModules.set(new Set());
    this.orderSent.set(false);
    this.uploadedFile.set(null);
    this.modBrand.set('');
    this.modEcu.set('');
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
  protected readonly catalog = CATALOG;
  protected readonly selBrand      = signal('');
  protected readonly selModel      = signal('');
  protected readonly selSeries     = signal('');
  protected readonly selEngineName = signal('');
  protected readonly selTune       = signal<'stage1' | 'stage2'>('stage1');
  protected readonly tuningResult  = signal<Engine | null>(null);

  protected readonly availableModels = computed(() =>
    CATALOG.find(x => x.label === this.selBrand())?.models ?? []
  );
  protected readonly availableSeries = computed(() =>
    this.availableModels().find(x => x.label === this.selModel())?.series ?? []
  );
  protected readonly availableEngines = computed(() =>
    this.availableSeries().find(x => x.label === this.selSeries())?.engines ?? []
  );
  protected readonly selEngine = computed(() =>
    this.availableEngines().find(e => e.label === this.selEngineName()) ?? null
  );
  protected readonly canCalculate = computed(() => !!this.selEngine());

  protected readonly tunedHp = computed(() => {
    const e = this.tuningResult();
    if (!e) { return 0; }
    return this.selTune() === 'stage1' ? e.stage1.hp : e.stage2.hp;
  });
  protected readonly tunedTorque = computed(() => {
    const e = this.tuningResult();
    if (!e) { return 0; }
    return this.selTune() === 'stage1' ? e.stage1.torque : e.stage2.torque;
  });
  protected readonly hpBarPct = computed(() => {
    const e = this.tuningResult();
    if (!e) { return 0; }
    return Math.min(100, (this.tunedHp() / Math.max(this.tunedHp(), e.stock.hp)) * 100);
  });
  protected readonly torqueBarPct = computed(() => {
    const e = this.tuningResult();
    if (!e) { return 0; }
    return Math.min(100, (this.tunedTorque() / Math.max(this.tunedTorque(), e.stock.torque)) * 100);
  });
  protected readonly hpPct = computed(() => {
    const e = this.tuningResult();
    if (!e) { return 0; }
    return Math.round(((this.tunedHp() - e.stock.hp) / e.stock.hp) * 100);
  });

  /** Build a power curve chart for either HP or Torque */
  private buildChart(stockMax: number, tunedMax: number) {
    const W = 480; const H = 220; const padX = 44; const padY = 22; const botY = 26;
    const chartH = H - padY - botY;
    const chartW = W - padX - 8;
    const xs   = [0, 0.15, 0.32, 0.5, 0.68, 0.82, 1.0];
    const sF   = [0.20, 0.45, 0.70, 0.88, 0.97, 1.00, 0.96];
    const tF   = [0.22, 0.49, 0.74, 0.92, 1.02, 1.07, 1.03];
    const yMax = tunedMax * 1.10;
    const toX  = (x: number) => padX + x * chartW;
    const toY  = (v: number) => padY + chartH - (v / yMax) * chartH;
    const makeBez = (pts: {x:number;y:number}[]) => {
      let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) {
        const cp1x = pts[i-1].x + (pts[i].x - pts[i-1].x) * 0.45;
        const cp2x = pts[i].x   - (pts[i].x - pts[i-1].x) * 0.45;
        d += ` C ${cp1x.toFixed(1)} ${pts[i-1].y.toFixed(1)} ${cp2x.toFixed(1)} ${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
      }
      return d;
    };
    const stockPts = xs.map((x, i) => ({ x: toX(x), y: toY(sF[i] * stockMax) }));
    const tunedPts = xs.map((x, i) => ({ x: toX(x), y: toY(tF[i] * tunedMax) }));
    const botLine  = `L ${toX(1).toFixed(1)} ${(H - botY).toFixed(1)} L ${toX(0).toFixed(1)} ${(H - botY).toFixed(1)} Z`;
    const stockPath = makeBez(stockPts);
    const tunedPath = makeBez(tunedPts);
    const gridSteps = [0, 0.25, 0.5, 0.75, 1.0];
    const gridY = gridSteps.map(p => ({ y: toY(p * yMax), label: p === 0 ? '' : `${Math.round(p * yMax)}` }));
    const rpmLabels = ['1500', '2500', '3500', '4500', '5500', '6500', '7200'];
    const xLabels = xs.map((x, i) => ({ x: toX(x), label: rpmLabels[i] }));
    const peakStockIdx = sF.indexOf(Math.max(...sF));
    const peakTunedIdx = tF.indexOf(Math.max(...tF));
    return {
      W, H, padX,
      stockPath, tunedPath,
      stockArea: stockPath + botLine,
      tunedArea: tunedPath + botLine,
      gridY, xLabels,
      stockPeak: stockPts[peakStockIdx],
      tunedPeak: tunedPts[peakTunedIdx],
      stockVal: stockMax,
      tunedVal: tunedMax,
    };
  }

  protected readonly hpChart = computed(() => {
    const e = this.tuningResult();
    if (!e) { return null; }
    return this.buildChart(e.stock.hp, this.tunedHp());
  });

  protected readonly torqueChart = computed(() => {
    const e = this.tuningResult();
    if (!e) { return null; }
    return this.buildChart(e.stock.torque, this.tunedTorque());
  });

  onBrand(ev: Event): void {
    this.selBrand.set((ev.target as HTMLSelectElement).value);
    this.selModel.set(''); this.selSeries.set(''); this.selEngineName.set(''); this.tuningResult.set(null);
  }
  onModel(ev: Event): void {
    this.selModel.set((ev.target as HTMLSelectElement).value);
    this.selSeries.set(''); this.selEngineName.set(''); this.tuningResult.set(null);
  }
  onSeries(ev: Event): void {
    this.selSeries.set((ev.target as HTMLSelectElement).value);
    this.selEngineName.set(''); this.tuningResult.set(null);
  }
  onEngine(ev: Event): void {
    this.selEngineName.set((ev.target as HTMLSelectElement).value);
    this.tuningResult.set(null);
  }
  calculate(): void {
    const engine = this.selEngine();
    if (!engine) { return; }
    this.tuningResult.set(engine);
  }
}