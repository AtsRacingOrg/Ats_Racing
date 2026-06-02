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
  Engine,
  FuelType,
  Model,
  Series,
} from '../../../core/catalog/catalog.service';

/* ─── Sonuç (modal) ─── */
interface StagePoint { hp: number; tq: number; }
interface Result {
  engineLabel: string;
  engineCode: string;
  displacementCc: number | null;
  bore: string | null;
  compressionRatio: string | null;
  ecu: string | null;
  fuelLabel: string;
  fuelClass: string;
  stockHp: number;
  stockTq: number;
  stage1: StagePoint;
  stage2: StagePoint | null;
  stage3: StagePoint | null;
}

/* ─── Component — gerçek katalog verisi (drill-down) ─── */
@Component({
  selector: 'app-home-chip-calculator',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
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
  protected readonly engines    = signal<Engine[]>([]);

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
      engineCode: e.engineNo ?? '—',
      displacementCc: e.displacementCc,
      bore: e.bore,
      compressionRatio: e.compressionRatio,
      ecu: e.ecu,
      fuelLabel: this.fuelLabel(e.fuel),
      fuelClass: this.fuelClass(e.fuel),
      stockHp: e.stock.hp, stockTq: e.stock.torque,
      stage1: { hp: e.stage1.hp, tq: e.stage1.torque },
      stage2: e.stage2 ? { hp: e.stage2.hp, tq: e.stage2.torque } : null,
      stage3: e.stage3 ? { hp: e.stage3.hp, tq: e.stage3.torque } : null,
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
}
