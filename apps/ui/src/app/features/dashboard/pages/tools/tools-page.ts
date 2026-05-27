import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

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
interface CarSeries {
  label: string;
  engines: Engine[];
}
interface CarModel {
  label: string;
  series: CarSeries[];
}
interface Brand {
  label: string;
  models: CarModel[];
}

interface TuneOption {
  key: 'stage1' | 'stage2';
  label: string;
  desc: string;
  color: string;
}

const CATALOG: Brand[] = [
  {
    label: 'BMW', models: [
      {
        label: 'M3', series: [
          {
            label: 'F80 (2014–2018)', engines: [
              { label: 'S55B30 3.0T', stock: { hp: 431, torque: 550 }, stage1: { hp: 500, torque: 620 }, stage2: { hp: 560, torque: 680 }, displacement: '3.0L Twin Turbo', ecu: 'Bosch MG1CS001', fuel: 'Benzin', year: '2014–2018' },
            ]
          },
          {
            label: 'G80 (2021–)', engines: [
              { label: 'S58B30 3.0T', stock: { hp: 510, torque: 650 }, stage1: { hp: 580, torque: 730 }, stage2: { hp: 650, torque: 820 }, displacement: '3.0L Twin Turbo', ecu: 'Bosch MG1CS024', fuel: 'Benzin', year: '2021–' },
            ]
          }
        ]
      },
      {
        label: 'M5', series: [
          {
            label: 'F90 (2018–)', engines: [
              { label: 'S63B44 4.4T', stock: { hp: 600, torque: 750 }, stage1: { hp: 680, torque: 840 }, stage2: { hp: 750, torque: 920 }, displacement: '4.4L V8 TT', ecu: 'Bosch MED17', fuel: 'Benzin', year: '2018–' },
            ]
          }
        ]
      }
    ]
  },
  {
    label: 'Audi', models: [
      {
        label: 'RS6', series: [
          {
            label: 'C8 (2020–)', engines: [
              { label: 'DKCE 4.0 TFSI', stock: { hp: 600, torque: 800 }, stage1: { hp: 680, torque: 880 }, stage2: { hp: 760, torque: 960 }, displacement: '4.0L V8 TT', ecu: 'Bosch MG1', fuel: 'Benzin', year: '2020–' },
            ]
          }
        ]
      },
      {
        label: 'S3', series: [
          {
            label: '8Y (2021–)', engines: [
              { label: 'DKZ 2.0 TFSI', stock: { hp: 310, torque: 400 }, stage1: { hp: 370, torque: 470 }, stage2: { hp: 430, torque: 530 }, displacement: '2.0L Turbo', ecu: 'Bosch MG1CS011', fuel: 'Benzin', year: '2021–' },
            ]
          }
        ]
      }
    ]
  },
  {
    label: 'Mercedes', models: [
      {
        label: 'C63 AMG', series: [
          {
            label: 'W205 (2015–2021)', engines: [
              { label: 'M177 4.0T', stock: { hp: 476, torque: 650 }, stage1: { hp: 560, torque: 730 }, stage2: { hp: 630, torque: 810 }, displacement: '4.0L V8 TT', ecu: 'Bosch MED17', fuel: 'Benzin', year: '2015–2021' },
            ]
          }
        ]
      }
    ]
  },
  {
    label: 'VW', models: [
      {
        label: 'Golf R', series: [
          {
            label: 'Mk8 (2021–)', engines: [
              { label: 'DKZ 2.0 TSI', stock: { hp: 320, torque: 420 }, stage1: { hp: 380, torque: 490 }, stage2: { hp: 440, torque: 560 }, displacement: '2.0L Turbo', ecu: 'Bosch MG1CS011', fuel: 'Benzin', year: '2021–' },
            ]
          }
        ]
      }
    ]
  },
  {
    label: 'Porsche', models: [
      {
        label: '911', series: [
          {
            label: 'Turbo S 992 (2021–)', engines: [
              { label: '9A2.51 3.8T', stock: { hp: 650, torque: 800 }, stage1: { hp: 730, torque: 890 }, stage2: { hp: 820, torque: 980 }, displacement: '3.8L Flat-6 TT', ecu: 'Bosch ME9.8', fuel: 'Benzin', year: '2021–' },
            ]
          }
        ]
      }
    ]
  }
];

@Component({
  selector: 'app-tools-page',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tp">

      <div class="tp__header">
        <h1 class="tp__title">Chip Tuning Hesaplayıcı</h1>
        <p class="tp__sub">Aracınızın ECU yazılım güncellemesiyle elde edeceği güç artışını hesaplayın</p>
      </div>

      <!-- SELECTOR GRID -->
      <div class="tp__card">
        <h2 class="tp__card-title">
          <i class="pi pi-sliders-h"></i> Araç Seçimi
        </h2>
        <div class="sel-grid">

          <!-- MARKA -->
          <div class="sel-group">
            <label class="sel-label" for="sel-brand">Marka</label>
            <div class="sel-wrap">
              <select id="sel-brand" class="sel" (change)="onBrand($event)" [disabled]="false">
                <option value="">— Marka seçin —</option>
                @for (b of catalog; track b.label) {
                  <option [value]="b.label">{{ b.label }}</option>
                }
              </select>
              <i class="pi pi-chevron-down sel-arrow"></i>
            </div>
          </div>

          <!-- MODEL -->
          <div class="sel-group">
            <label class="sel-label" for="sel-model">Model</label>
            <div class="sel-wrap">
              <select id="sel-model" class="sel" (change)="onModel($event)" [disabled]="!selBrand()">
                <option value="">— Model seçin —</option>
                @for (m of availableModels(); track m.label) {
                  <option [value]="m.label">{{ m.label }}</option>
                }
              </select>
              <i class="pi pi-chevron-down sel-arrow"></i>
            </div>
          </div>

          <!-- SERİ -->
          <div class="sel-group">
            <label class="sel-label" for="sel-series">Seri / Yıl</label>
            <div class="sel-wrap">
              <select id="sel-series" class="sel" (change)="onSeries($event)" [disabled]="!selModel()">
                <option value="">— Seri seçin —</option>
                @for (s of availableSeries(); track s.label) {
                  <option [value]="s.label">{{ s.label }}</option>
                }
              </select>
              <i class="pi pi-chevron-down sel-arrow"></i>
            </div>
          </div>

          <!-- MOTOR -->
          <div class="sel-group">
            <label class="sel-label" for="sel-engine">Motor</label>
            <div class="sel-wrap">
              <select id="sel-engine" class="sel" (change)="onEngine($event)" [disabled]="!selSeries()">
                <option value="">— Motor seçin —</option>
                @for (e of availableEngines(); track e.label) {
                  <option [value]="e.label">{{ e.label }}</option>
                }
              </select>
              <i class="pi pi-chevron-down sel-arrow"></i>
            </div>
          </div>

        </div>

        <!-- TUNE LEVEL -->
        @if (selEngine()) {
          <div class="tune-opts">
            <p class="sel-label" style="margin-bottom:0.75rem;">Yazılım Seviyesi</p>
            <div class="tune-opts__grid">
              @for (opt of tuneOptions; track opt.key) {
                <button
                  class="tune-opt"
                  [class.tune-opt--active]="selTune() === opt.key"
                  [style.--accent]="opt.color"
                  (click)="selTune.set(opt.key)"
                >
                  <span class="tune-opt__label">{{ opt.label }}</span>
                  <span class="tune-opt__desc">{{ opt.desc }}</span>
                </button>
              }
            </div>
          </div>
        }

        <button
          class="calc-btn"
          [disabled]="!canCalculate()"
          (click)="calculate()"
        >
          <i class="pi pi-bolt"></i>
          Hesapla
        </button>
      </div>

      <!-- RESULT -->
      @if (result()) {
        <div class="result-wrap">

          <!-- VEHICLE INFO -->
          <div class="result-info">
            <div class="result-info__badge">{{ selBrand() }}</div>
            <h2 class="result-info__name">{{ selBrand() }} {{ selModel() }}</h2>
            <p class="result-info__meta">{{ result()!.engine.displacement }} · {{ result()!.engine.ecu }} · {{ result()!.engine.fuel }} · {{ result()!.engine.year }}</p>
          </div>

          <!-- POWER COMPARISON -->
          <div class="result-grid">

            <!-- STOCK -->
            <div class="power-card power-card--stock">
              <span class="power-card__tag">Orjinal</span>
              <div class="power-card__row">
                <div class="power-card__val">
                  <span class="power-card__num">{{ result()!.engine.stock.hp }}</span>
                  <span class="power-card__unit">HP</span>
                </div>
                <div class="power-card__sep"></div>
                <div class="power-card__val">
                  <span class="power-card__num">{{ result()!.engine.stock.torque }}</span>
                  <span class="power-card__unit">Nm</span>
                </div>
              </div>
              <div class="power-bar-wrap">
                <div class="power-bar" style="width:100%; background: rgba(255,255,255,0.15)"></div>
              </div>
            </div>

            <!-- TUNED -->
            <div class="power-card power-card--tuned">
              <span class="power-card__tag power-card__tag--red">{{ tuneLabel() }}</span>
              <div class="power-card__row">
                <div class="power-card__val">
                  <span class="power-card__num power-card__num--accent">{{ tunedHp() }}</span>
                  <span class="power-card__unit">HP</span>
                  <span class="power-card__delta">+{{ tunedHp() - result()!.engine.stock.hp }}</span>
                </div>
                <div class="power-card__sep"></div>
                <div class="power-card__val">
                  <span class="power-card__num power-card__num--accent">{{ tunedTorque() }}</span>
                  <span class="power-card__unit">Nm</span>
                  <span class="power-card__delta">+{{ tunedTorque() - result()!.engine.stock.torque }}</span>
                </div>
              </div>
              <div class="power-bar-wrap">
                <div class="power-bar power-bar--accent" [style.width]="barPct() + '%'"></div>
              </div>
            </div>

          </div>

          <!-- BAR VISUAL -->
          <div class="gauge-section">
            <h3 class="gauge-title">Güç Karşılaştırması</h3>
            <div class="gauge-rows">
              <!-- HP -->
              <div class="gauge-row">
                <span class="gauge-lbl">HP</span>
                <div class="gauge-track">
                  <div class="gauge-fill gauge-fill--base" style="width:100%">
                    <span class="gauge-fill__val">{{ result()!.engine.stock.hp }}</span>
                  </div>
                </div>
              </div>
              <div class="gauge-row">
                <span class="gauge-lbl" style="color:#e63946">HP</span>
                <div class="gauge-track">
                  <div class="gauge-fill gauge-fill--tuned" [style.width]="barPct() + '%'">
                    <span class="gauge-fill__val">{{ tunedHp() }}</span>
                  </div>
                </div>
              </div>
              <!-- TORQUE -->
              <div class="gauge-row" style="margin-top:0.75rem">
                <span class="gauge-lbl">Nm</span>
                <div class="gauge-track">
                  <div class="gauge-fill gauge-fill--base" style="width:100%">
                    <span class="gauge-fill__val">{{ result()!.engine.stock.torque }}</span>
                  </div>
                </div>
              </div>
              <div class="gauge-row">
                <span class="gauge-lbl" style="color:#e63946">Nm</span>
                <div class="gauge-track">
                  <div class="gauge-fill gauge-fill--tuned" [style.width]="torqueBarPct() + '%'">
                    <span class="gauge-fill__val">{{ tunedTorque() }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- DETAILS TABLE -->
          <div class="detail-table">
            <h3 class="gauge-title">Teknik Detaylar</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-item__lbl">Motor Hacmi</span>
                <span class="detail-item__val">{{ result()!.engine.displacement }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item__lbl">ECU</span>
                <span class="detail-item__val">{{ result()!.engine.ecu }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item__lbl">Yakıt Tipi</span>
                <span class="detail-item__val">{{ result()!.engine.fuel }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item__lbl">Üretim Yılı</span>
                <span class="detail-item__val">{{ result()!.engine.year }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item__lbl">HP Artışı</span>
                <span class="detail-item__val detail-item__val--green">+{{ tunedHp() - result()!.engine.stock.hp }} HP</span>
              </div>
              <div class="detail-item">
                <span class="detail-item__lbl">Tork Artışı</span>
                <span class="detail-item__val detail-item__val--green">+{{ tunedTorque() - result()!.engine.stock.torque }} Nm</span>
              </div>
              <div class="detail-item">
                <span class="detail-item__lbl">HP Artış %</span>
                <span class="detail-item__val detail-item__val--green">%{{ hpPct() }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item__lbl">Yazılım Seviyesi</span>
                <span class="detail-item__val">{{ tuneLabel() }}</span>
              </div>
            </div>
          </div>

          <!-- CTA -->
          <div class="result-cta">
            <p class="result-cta__note">
              <i class="pi pi-info-circle"></i>
              Sonuçlar standart koşullarda geçerlidir. Gerçek kazanımlar araç durumuna göre değişebilir.
            </p>
            <div class="result-cta__btns">
              <button class="cta-btn cta-btn--primary">
                <i class="pi pi-shopping-cart"></i>
                Yazılım Satın Al
              </button>
              <a href="/contact" class="cta-btn cta-btn--outline">
                <i class="pi pi-headphones"></i>
                Uzmanla Konuş
              </a>
            </div>
          </div>

        </div>
      }

    </div>
  `,
  styles: [`
    .tp { display: flex; flex-direction: column; gap: 1.75rem; }

    .tp__header {}
    .tp__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .tp__sub { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.3rem 0 0; }

    .tp__card {
      background: #1a1d27;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 20px;
      padding: 1.75rem;
    }
    .tp__card-title {
      font-size: 1rem; font-weight: 600; color: #fff;
      margin: 0 0 1.5rem;
      display: flex; align-items: center; gap: 0.5rem;
    }
    .tp__card-title i { color: #e63946; }

    /* SELECTORS */
    .sel-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .sel-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .sel-label { font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.06em; }
    .sel-wrap { position: relative; }
    .sel {
      width: 100%; padding: 0.75rem 2.5rem 0.75rem 1rem;
      background: #0d0f14;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      color: rgba(255,255,255,0.85);
      font-size: 0.875rem;
      appearance: none; cursor: pointer;
      transition: border-color 200ms;
    }
    .sel:focus { outline: none; border-color: rgba(230,57,70,0.5); }
    .sel:disabled { opacity: 0.35; cursor: not-allowed; }
    .sel option { background: #1a1d27; }
    .sel-arrow {
      position: absolute; right: 0.875rem; top: 50%; transform: translateY(-50%);
      color: rgba(255,255,255,0.35); font-size: 0.75rem; pointer-events: none;
    }

    /* TUNE OPTIONS */
    .tune-opts { margin-bottom: 1.5rem; }
    .tune-opts__grid { display: flex; gap: 0.875rem; flex-wrap: wrap; }
    .tune-opt {
      flex: 1; min-width: 160px;
      display: flex; flex-direction: column; gap: 4px;
      padding: 1rem 1.25rem;
      border: 1.5px solid rgba(255,255,255,0.1);
      border-radius: 12px; background: transparent;
      cursor: pointer; text-align: left;
      transition: all 200ms;
    }
    .tune-opt:hover { border-color: rgba(255,255,255,0.22); background: rgba(255,255,255,0.03); }
    .tune-opt--active {
      border-color: var(--accent, #e63946) !important;
      background: rgba(230,57,70,0.08) !important;
    }
    .tune-opt__label { font-size: 0.9rem; font-weight: 700; color: #fff; }
    .tune-opt__desc { font-size: 0.73rem; color: rgba(255,255,255,0.4); }

    /* CALC BTN */
    .calc-btn {
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.875rem 2rem; border-radius: 12px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #e63946, #c1121f);
      color: #fff; font-size: 0.9rem; font-weight: 700;
      letter-spacing: 0.04em;
      transition: opacity 200ms, transform 180ms;
    }
    .calc-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
    .calc-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    /* RESULT */
    .result-wrap {
      display: flex; flex-direction: column; gap: 1.25rem;
      animation: fadeInUp 400ms ease both;
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .result-info {
      background: linear-gradient(135deg, #1e0f12, #1a1d27);
      border: 1px solid rgba(230,57,70,0.2);
      border-radius: 16px; padding: 1.5rem;
    }
    .result-info__badge {
      display: inline-block;
      background: rgba(230,57,70,0.15); color: #e63946;
      font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
      padding: 3px 10px; border-radius: 20px; margin-bottom: 0.625rem;
    }
    .result-info__name { font-size: 1.5rem; font-weight: 800; color: #fff; margin: 0 0 0.25rem; }
    .result-info__meta { font-size: 0.78rem; color: rgba(255,255,255,0.4); margin: 0; }

    .result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (max-width: 640px) { .result-grid { grid-template-columns: 1fr; } }

    .power-card {
      background: #1a1d27;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px; padding: 1.5rem;
    }
    .power-card--tuned { border-color: rgba(230,57,70,0.25); background: linear-gradient(160deg, #1f1215, #1a1d27); }

    .power-card__tag {
      display: inline-block;
      font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
      background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5);
      padding: 3px 10px; border-radius: 20px; margin-bottom: 1rem;
    }
    .power-card__tag--red { background: rgba(230,57,70,0.15); color: #e63946; }

    .power-card__row { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1rem; }
    .power-card__val { display: flex; align-items: baseline; gap: 6px; }
    .power-card__num { font-size: 2.2rem; font-weight: 800; color: rgba(255,255,255,0.7); line-height: 1; }
    .power-card__num--accent { color: #fff; }
    .power-card__unit { font-size: 0.85rem; color: rgba(255,255,255,0.35); }
    .power-card__delta {
      font-size: 0.78rem; font-weight: 700; color: #4ade80;
      background: rgba(74,222,128,0.12);
      padding: 2px 8px; border-radius: 20px;
    }
    .power-card__sep { width: 1px; height: 40px; background: rgba(255,255,255,0.08); }

    .power-bar-wrap { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
    .power-bar { height: 100%; border-radius: 3px; transition: width 600ms ease; }
    .power-bar--accent { background: linear-gradient(90deg, #e63946, #ff6b6b); }

    /* GAUGE */
    .gauge-section {
      background: #1a1d27;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px; padding: 1.5rem;
    }
    .gauge-title { font-size: 0.95rem; font-weight: 600; color: #fff; margin: 0 0 1.25rem; }
    .gauge-rows { display: flex; flex-direction: column; gap: 0.5rem; }
    .gauge-row { display: flex; align-items: center; gap: 1rem; }
    .gauge-lbl { font-size: 0.75rem; font-weight: 600; color: rgba(255,255,255,0.4); width: 24px; flex-shrink: 0; }
    .gauge-track { flex: 1; height: 28px; background: rgba(255,255,255,0.04); border-radius: 6px; overflow: hidden; }
    .gauge-fill {
      height: 100%; border-radius: 6px;
      display: flex; align-items: center; justify-content: flex-end; padding-right: 10px;
      transition: width 800ms cubic-bezier(0.22,1,0.36,1);
    }
    .gauge-fill--base { background: rgba(255,255,255,0.12); }
    .gauge-fill--tuned { background: linear-gradient(90deg, #c1121f, #e63946); }
    .gauge-fill__val { font-size: 0.72rem; font-weight: 700; color: rgba(255,255,255,0.8); }

    /* DETAILS */
    .detail-table {
      background: #1a1d27;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px; padding: 1.5rem;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
    }
    .detail-item {
      display: flex; flex-direction: column; gap: 4px;
      padding: 0.875rem; background: rgba(255,255,255,0.03);
      border-radius: 10px;
    }
    .detail-item__lbl { font-size: 0.7rem; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.05em; }
    .detail-item__val { font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.85); }
    .detail-item__val--green { color: #4ade80; }

    /* CTA */
    .result-cta {
      background: #1a1d27;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px; padding: 1.5rem;
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 1rem;
    }
    .result-cta__note {
      font-size: 0.78rem; color: rgba(255,255,255,0.4); margin: 0;
      display: flex; align-items: flex-start; gap: 0.5rem; max-width: 400px;
    }
    .result-cta__note i { color: #60a5fa; margin-top: 1px; flex-shrink: 0; }
    .result-cta__btns { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .cta-btn {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 1.5rem; border-radius: 10px; border: none; cursor: pointer;
      font-size: 0.875rem; font-weight: 600;
      text-decoration: none; transition: all 200ms;
    }
    .cta-btn--primary { background: linear-gradient(135deg, #e63946, #c1121f); color: #fff; }
    .cta-btn--primary:hover { opacity: 0.85; transform: translateY(-1px); }
    .cta-btn--outline { background: transparent; color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.15); }
    .cta-btn--outline:hover { border-color: rgba(255,255,255,0.3); color: #fff; }
  `],
})
export class ToolsPage {
  protected readonly catalog = CATALOG;

  protected readonly selBrand = signal('');
  protected readonly selModel = signal('');
  protected readonly selSeries = signal('');
  protected readonly selEngineName = signal('');
  protected readonly selTune = signal<'stage1' | 'stage2'>('stage1');
  protected readonly result = signal<{ engine: Engine } | null>(null);

  protected readonly tuneOptions: TuneOption[] = [
    { key: 'stage1', label: 'Stage 1', desc: 'Sadece yazılım — ek donanım gerektirmez', color: '#60a5fa' },
    { key: 'stage2', label: 'Stage 2', desc: 'Downpipe + intercooler ile maksimum kazanım', color: '#e63946' },
  ];

  protected readonly availableModels = computed(() => {
    const b = this.catalog.find(x => x.label === this.selBrand());
    return b?.models ?? [];
  });
  protected readonly availableSeries = computed(() => {
    const b = this.catalog.find(x => x.label === this.selBrand());
    const m = b?.models.find(x => x.label === this.selModel());
    return m?.series ?? [];
  });
  protected readonly availableEngines = computed(() => {
    const b = this.catalog.find(x => x.label === this.selBrand());
    const m = b?.models.find(x => x.label === this.selModel());
    const s = m?.series.find(x => x.label === this.selSeries());
    return s?.engines ?? [];
  });
  protected readonly selEngine = computed(() => {
    return this.availableEngines().find(e => e.label === this.selEngineName()) ?? null;
  });

  protected readonly canCalculate = computed(() => !!this.selEngine());

  protected readonly tunedHp = computed(() => {
    const e = this.result()?.engine;
    if (!e) return 0;
    return this.selTune() === 'stage1' ? e.stage1.hp : e.stage2.hp;
  });
  protected readonly tunedTorque = computed(() => {
    const e = this.result()?.engine;
    if (!e) return 0;
    return this.selTune() === 'stage1' ? e.stage1.torque : e.stage2.torque;
  });
  protected readonly barPct = computed(() => {
    const e = this.result()?.engine;
    if (!e) return 0;
    return Math.min(100, (this.tunedHp() / Math.max(this.tunedHp(), e.stock.hp)) * 100);
  });
  protected readonly torqueBarPct = computed(() => {
    const e = this.result()?.engine;
    if (!e) return 0;
    return Math.min(100, (this.tunedTorque() / Math.max(this.tunedTorque(), e.stock.torque)) * 100);
  });
  protected readonly hpPct = computed(() => {
    const e = this.result()?.engine;
    if (!e) return 0;
    return Math.round(((this.tunedHp() - e.stock.hp) / e.stock.hp) * 100);
  });
  protected readonly tuneLabel = computed(() => this.selTune() === 'stage1' ? 'Stage 1' : 'Stage 2');

  onBrand(ev: Event): void {
    this.selBrand.set((ev.target as HTMLSelectElement).value);
    this.selModel.set(''); this.selSeries.set(''); this.selEngineName.set(''); this.result.set(null);
  }
  onModel(ev: Event): void {
    this.selModel.set((ev.target as HTMLSelectElement).value);
    this.selSeries.set(''); this.selEngineName.set(''); this.result.set(null);
  }
  onSeries(ev: Event): void {
    this.selSeries.set((ev.target as HTMLSelectElement).value);
    this.selEngineName.set(''); this.result.set(null);
  }
  onEngine(ev: Event): void {
    this.selEngineName.set((ev.target as HTMLSelectElement).value);
    this.result.set(null);
  }

  calculate(): void {
    const engine = this.selEngine();
    if (!engine) return;
    this.result.set({ engine });
  }
}
