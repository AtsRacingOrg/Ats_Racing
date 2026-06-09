import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  Brand,
  CatalogService,
  EnginePublic,
  FuelType,
  Model,
  Series,
} from '../../../core/catalog/catalog.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

/* ─── Sonuç (modal) ─── */
interface StagePoint { hp: number; tq: number; }
interface Result {
  engineLabel: string;
  displacementCc: number | null;
  fuel: FuelType;
  fuelLabel: string;
  fuelClass: string;
  stockHp: number;
  stockTq: number;
  stage1: StagePoint;
  stage2: StagePoint | null;
}

/* ─── Component — gerçek katalog verisi (drill-down) ─── */
@Component({
  selector: 'app-home-chip-calculator',
  standalone: true,
  imports: [DecimalPipe, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chip-calculator.html',
  styleUrl: './chip-calculator.scss',
})
export class HomeChipCalculator implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly brands     = signal<Brand[]>([]);
  protected readonly models     = signal<Model[]>([]);
  protected readonly seriesList = signal<Series[]>([]);
  protected readonly engines    = signal<EnginePublic[]>([]);

  protected readonly brandId  = signal<string>('');
  protected readonly modelId  = signal<string>('');
  protected readonly seriesId = signal<string>('');
  protected readonly engineId = signal<string>('');

  protected readonly showModal  = signal<boolean>(false);
  protected readonly result     = signal<Result | null>(null);
  protected readonly submitted  = signal(false);

  /* Modal başlığı için seçili isimler */
  protected readonly brandName  = computed(() => this.brands().find(b => b.id === this.brandId())?.name ?? '');
  protected readonly modelName  = computed(() => this.models().find(m => m.id === this.modelId())?.name ?? '');
  protected readonly seriesName = computed(() => this.seriesList().find(s => s.id === this.seriesId())?.name ?? '');

  ngOnInit(): void {
    this.catalog.listBrands()
      .then(b => { this.brands.set(b); this.cdr.markForCheck(); })
      .catch(() => { /* sessiz */ });
  }

  /* ─── Seçimler (her adımda bir sonrakini API'den çek) ─── */
  protected onBrand(id: string): void {
    this.brandId.set(id); this.modelId.set(''); this.seriesId.set(''); this.engineId.set('');
    this.models.set([]); this.seriesList.set([]); this.engines.set([]);
    this.result.set(null); this.submitted.set(false);
    if (id) {
      this.catalog.listModels(id).then(m => { this.models.set(m); this.cdr.markForCheck(); }).catch(() => {});
    }
  }
  protected onModel(id: string): void {
    this.modelId.set(id); this.seriesId.set(''); this.engineId.set('');
    this.seriesList.set([]); this.engines.set([]);
    this.result.set(null); this.submitted.set(false);
    if (id) {
      this.catalog.listSeries(id).then(s => { this.seriesList.set(s); this.cdr.markForCheck(); }).catch(() => {});
    }
  }
  protected onSeries(id: string): void {
    this.seriesId.set(id); this.engineId.set('');
    this.engines.set([]);
    this.result.set(null); this.submitted.set(false);
    if (id) {
      this.catalog.listEngines(id).then(e => { this.engines.set(e); this.cdr.markForCheck(); }).catch(() => {});
    }
  }
  protected onEngine(id: string): void {
    this.engineId.set(id); this.result.set(null); this.submitted.set(false);
  }

  protected canSubmit(): boolean {
    return !!this.brandId() && !!this.modelId() && !!this.seriesId() && !!this.engineId();
  }

  protected calculate(): void {
    this.submitted.set(true);
    if (!this.canSubmit()) { return; }
    const e = this.engines().find(x => x.id === this.engineId());
    if (!e) { return; }
    this.result.set({
      engineLabel: e.label,
      displacementCc: e.displacementCc,
      fuel: e.fuel,
      fuelLabel: this.fuelLabel(e.fuel),
      fuelClass: this.fuelClass(e.fuel),
      stockHp: e.stock.hp, stockTq: e.stock.torque,
      stage1: { hp: e.stage1.hp, tq: e.stage1.torque },
      stage2: e.stage2 ? { hp: e.stage2.hp, tq: e.stage2.torque } : null,
    });
    this.showModal.set(true);
    document.body.style.overflow = 'hidden';
  }

  protected closeModal(): void {
    this.showModal.set(false);
    document.body.style.overflow = '';
  }

  protected reset(): void {
    this.brandId.set(''); this.modelId.set(''); this.seriesId.set(''); this.engineId.set('');
    this.models.set([]); this.seriesList.set([]); this.engines.set([]);
    this.result.set(null); this.submitted.set(false);
    this.closeModal();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { if (this.showModal()) { this.closeModal(); } }

  /* ─── Yakıt eşlemeleri ─── */
  protected fuelLabel(f: FuelType): string {
    if (f.startsWith('petrol')) { return f === 'petrol' ? 'Benzin' : 'Benzin Hibrit'; }
    if (f.startsWith('diesel')) { return f === 'diesel' ? 'Dizel' : 'Dizel Hibrit'; }
    if (f === 'ev') { return 'Elektrik'; }
    if (f === 'lpg') { return 'LPG'; }
    return 'Hibrit';
  }
  protected fuelClass(f: FuelType): string {
    if (f.startsWith('petrol')) { return 'petrol'; }
    if (f.startsWith('diesel')) { return 'diesel'; }
    return 'hybrid';
  }

  /* ─── Dyno grafikleri (dashboard'daki ile aynı mantık) ─── */

  /** En yüksek stage = "tuned" çizgisi. */
  protected readonly tunedHp = computed(() => {
    const r = this.result();
    return r ? (r.stage2?.hp ?? r.stage1.hp) : 0;
  });
  protected readonly tunedTq = computed(() => {
    const r = this.result();
    return r ? (r.stage2?.tq ?? r.stage1.tq) : 0;
  });
  protected readonly tuneLabel = computed(() => (this.result()?.stage2 ? 'Stage 2' : 'Stage 1'));

  protected readonly hpChart = computed(() => {
    const r = this.result();
    if (!r) { return null; }
    const b = this.revBand(r.fuel);
    return this.buildChart(r.stockHp, this.tunedHp(), 'power', b.min, b.max);
  });
  protected readonly torqueChart = computed(() => {
    const r = this.result();
    if (!r) { return null; }
    const b = this.revBand(r.fuel);
    return this.buildChart(r.stockTq, this.tunedTq(), 'torque', b.min, b.max);
  });

  /** Devir bandı — dizel düşük, benzin yüksek devirli. */
  private revBand(fuel: FuelType): { min: number; max: number } {
    const diesel = fuel.startsWith('diesel');
    return diesel ? { min: 850, max: 5200 } : { min: 900, max: 7000 };
  }

  /**
   * Gerçekçi dyno eğrisi üretir (görsel amaçlı — sabit/sahte).
   *  - Tork: orta devirde erken tepe, geniş plato, redline'a doğru düşer.
   *  - Güç: tork × devir'den türetilir → daha geç tepe yapar.
   */
  private buildChart(
    stockMax: number, tunedMax: number,
    kind: 'power' | 'torque', rpmMin: number, rpmMax: number,
  ) {
    const W = 480; const H = 220; const padX = 44; const padY = 22; const botY = 26;
    const chartH = H - padY - botY;
    const chartW = W - padX - 8;

    const torqueFactor = (x: number) => {
      const rise = 1 - Math.exp(-(x + 0.04) / 0.13);
      const fall = 1 - 0.70 * Math.pow(Math.max(0, x - 0.30) / 0.70, 1.5);
      return rise * fall;
    };
    const rpmAt = (x: number) => rpmMin + x * (rpmMax - rpmMin);
    const shapeFn = kind === 'torque'
      ? torqueFactor
      : (x: number) => torqueFactor(x) * rpmAt(x);

    const N = 40;
    const xs: number[] = [];
    for (let i = 0; i <= N; i++) { xs.push(i / N); }
    const raw = xs.map(shapeFn);
    const rawMax = Math.max(...raw);
    const factor = raw.map(v => v / rawMax);

    const yMax = (tunedMax || 1) * 1.08;
    const toX = (x: number) => padX + x * chartW;
    const toY = (v: number) => padY + chartH - (v / yMax) * chartH;
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

    const noise = (x: number, seed: number) =>
      Math.sin(x * 31 + seed * 1.7) * 0.009 +
      Math.sin(x * 17 + seed * 0.9 + 0.6) * 0.013 +
      Math.sin(x * 8 + seed * 1.3 + 1.1) * 0.011;
    const stockPts = xs.map((x, i) => ({ x: toX(x), y: toY(factor[i] * (1 + noise(x, 0)) * stockMax) }));
    const tunedPts = xs.map((x, i) => ({ x: toX(x), y: toY(factor[i] * (1 + noise(x, 1)) * tunedMax) }));
    const botLine = `L ${toX(1).toFixed(1)} ${(H - botY).toFixed(1)} L ${toX(0).toFixed(1)} ${(H - botY).toFixed(1)} Z`;
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
    };
  }
}
