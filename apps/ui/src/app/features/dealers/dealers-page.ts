import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  afterNextRender,
  computed,
  signal,
} from '@angular/core';
import { SectionHeading } from '../../shared/ui/section-heading/section-heading';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { MapRegion, TR_REGIONS } from '../../shared/data/turkey-map';
import { DE_REGIONS } from '../../shared/data/germany-map';
import { DEALERS, Dealer, DealerCountry, mapsUrl } from '../../shared/data/dealers';

@Component({
  selector: 'app-dealers-page',
  standalone: true,
  imports: [SectionHeading, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dealers-page.html',
  styleUrl: './dealers-page.scss',
})
export default class DealersPage {
  protected readonly country = signal<DealerCountry>('TR');
  protected readonly selected = signal<string | null>(null);
  protected readonly viewBox = signal('0 0 800 360');

  @ViewChild('mapSvg') private mapSvg?: ElementRef<SVGSVGElement>;

  protected readonly regions = computed<MapRegion[]>(
    () => (this.country() === 'TR' ? TR_REGIONS : DE_REGIONS),
  );
  protected readonly dealers = computed<Dealer[]>(
    () => DEALERS.filter(d => d.country === this.country()),
  );
  /** Bayi bulunan bölgeler (haritada kırmızı). */
  protected readonly activeRegions = computed(() => new Set(this.dealers().map(d => d.region)));
  /** Listelenecek bayiler — bölge seçiliyse filtreli. */
  protected readonly visibleDealers = computed(() => {
    const sel = this.selected();
    return sel ? this.dealers().filter(d => d.region === sel) : this.dealers();
  });
  protected readonly count = computed(() => this.dealers().length);

  constructor() {
    afterNextRender(() => this.measure());
  }

  protected setCountry(c: DealerCountry): void {
    if (c === this.country()) { return; }
    this.country.set(c);
    this.selected.set(null);
    setTimeout(() => this.measure(), 0); // DOM güncellensin, sonra viewBox ölç
  }

  protected hasDealer(name: string): boolean { return this.activeRegions().has(name); }

  protected onRegionClick(name: string): void {
    if (!this.hasDealer(name)) { return; }
    this.selected.update(s => (s === name ? null : name));
  }

  protected clearFilter(): void { this.selected.set(null); }

  protected mapsUrl(d: Dealer): string { return mapsUrl(d); }

  /** Tüm path'lerin sınır kutusundan viewBox üretir (relative path'ler için güvenli). */
  private measure(): void {
    const svg = this.mapSvg?.nativeElement;
    if (!svg) { return; }
    try {
      const b = svg.getBBox();
      if (!b.width || !b.height) { return; }
      const pad = Math.max(b.width, b.height) * 0.02;
      this.viewBox.set(`${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`);
    } catch { /* getBBox desteklenmiyorsa varsayılan kalır */ }
  }
}
