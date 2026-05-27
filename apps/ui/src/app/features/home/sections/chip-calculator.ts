import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

interface EngineGain {
  readonly engine: string;
  readonly stockHp: number;
  readonly tunedHp: number;
  readonly stockTq: number;
  readonly tunedTq: number;
}

interface Series {
  readonly name: string;
  readonly engines: readonly EngineGain[];
}

interface Model {
  readonly name: string;
  readonly series: readonly Series[];
}

interface Brand {
  readonly name: string;
  readonly models: readonly Model[];
}

const CATALOG: readonly Brand[] = [
  {
    name: 'BMW',
    models: [
      {
        name: 'M3',
        series: [
          { name: 'F80', engines: [
            { engine: '3.0 BiTurbo 431 HP', stockHp: 431, tunedHp: 540, stockTq: 550, tunedTq: 720 },
            { engine: '3.0 BiTurbo Competition', stockHp: 450, tunedHp: 560, stockTq: 550, tunedTq: 740 },
          ]},
          { name: 'G80', engines: [
            { engine: '3.0 BiTurbo Competition', stockHp: 510, tunedHp: 620, stockTq: 650, tunedTq: 840 },
          ]},
        ],
      },
      {
        name: 'M5',
        series: [
          { name: 'F90', engines: [
            { engine: '4.4 V8 BiTurbo', stockHp: 600, tunedHp: 750, stockTq: 750, tunedTq: 950 },
          ]},
        ],
      },
    ],
  },
  {
    name: 'Audi',
    models: [
      {
        name: 'RS6',
        series: [
          { name: 'C8', engines: [
            { engine: '4.0 TFSI V8', stockHp: 600, tunedHp: 740, stockTq: 800, tunedTq: 1000 },
          ]},
        ],
      },
      {
        name: 'S3',
        series: [
          { name: '8Y', engines: [
            { engine: '2.0 TFSI', stockHp: 310, tunedHp: 405, stockTq: 400, tunedTq: 510 },
          ]},
        ],
      },
    ],
  },
  {
    name: 'Mercedes',
    models: [
      {
        name: 'C63 AMG',
        series: [
          { name: 'W205', engines: [
            { engine: '4.0 V8 BiTurbo', stockHp: 476, tunedHp: 590, stockTq: 650, tunedTq: 820 },
          ]},
        ],
      },
    ],
  },
  {
    name: 'Porsche',
    models: [
      {
        name: '911 Turbo S',
        series: [
          { name: '992', engines: [
            { engine: '3.8 BiTurbo', stockHp: 650, tunedHp: 780, stockTq: 800, tunedTq: 980 },
          ]},
        ],
      },
    ],
  },
  {
    name: 'Volkswagen',
    models: [
      {
        name: 'Golf R',
        series: [
          { name: 'Mk8', engines: [
            { engine: '2.0 TSI', stockHp: 320, tunedHp: 410, stockTq: 420, tunedTq: 530 },
          ]},
        ],
      },
    ],
  },
];

@Component({
  selector: 'app-home-chip-calculator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chip-calculator.html',
  styleUrl: './chip-calculator.scss',
})
export class HomeChipCalculator {
  protected readonly catalog = CATALOG;

  protected readonly brand = signal<string>('');
  protected readonly model = signal<string>('');
  protected readonly series = signal<string>('');
  protected readonly engine = signal<string>('');

  protected readonly models = computed<readonly Model[]>(() =>
    this.catalog.find((b) => b.name === this.brand())?.models ?? [],
  );

  protected readonly seriesList = computed<readonly Series[]>(() =>
    this.models().find((m) => m.name === this.model())?.series ?? [],
  );

  protected readonly engines = computed<readonly EngineGain[]>(() =>
    this.seriesList().find((s) => s.name === this.series())?.engines ?? [],
  );

  protected readonly result = signal<EngineGain | null>(null);
  protected readonly submitted = signal(false);

  protected onBrand(v: string): void {
    this.brand.set(v);
    this.model.set('');
    this.series.set('');
    this.engine.set('');
    this.result.set(null);
    this.submitted.set(false);
  }
  protected onModel(v: string): void {
    this.model.set(v);
    this.series.set('');
    this.engine.set('');
    this.result.set(null);
    this.submitted.set(false);
  }
  protected onSeries(v: string): void {
    this.series.set(v);
    this.engine.set('');
    this.result.set(null);
    this.submitted.set(false);
  }
  protected onEngine(v: string): void {
    this.engine.set(v);
    this.result.set(null);
    this.submitted.set(false);
  }

  protected canSubmit(): boolean {
    return !!this.brand() && !!this.model() && !!this.series() && !!this.engine();
  }

  protected calculate(): void {
    this.submitted.set(true);
    if (!this.canSubmit()) return;
    const found = this.engines().find((e) => e.engine === this.engine()) ?? null;
    this.result.set(found);
  }

  protected reset(): void {
    this.brand.set('');
    this.model.set('');
    this.series.set('');
    this.engine.set('');
    this.result.set(null);
    this.submitted.set(false);
  }

  protected hpGain(r: EngineGain): number {
    return r.tunedHp - r.stockHp;
  }
  protected tqGain(r: EngineGain): number {
    return r.tunedTq - r.stockTq;
  }
}
