import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/* ─── Tipler (API view'leriyle birebir) ─── */
export type FuelType =
  | 'petrol'
  | 'diesel'
  | 'petrol_mhev'
  | 'petrol_phev'
  | 'petrol_hybrid'
  | 'diesel_mhev'
  | 'diesel_phev'
  | 'diesel_hybrid'
  | 'ev'
  | 'lpg';

export type ServiceKind = 'module' | 'extra';
export type TuningStage = 'stage1' | 'stage2' | 'stage3';

export interface Brand {
  id: string;
  name: string;
}
export interface Model {
  id: string;
  name: string;
}
export interface Series {
  id: string;
  name: string;
  yearLabel: string | null;
  yearFrom: number | null;
  yearTo: number | null;
}
export interface PowerPoint {
  hp: number;
  torque: number;
}

/** Herkese açık endpoint'ten gelen kısıtlı motor verisi. */
export interface EnginePublic {
  id: string;
  label: string;
  fuel: FuelType;
  displacementCc: number | null;
  stock: PowerPoint;
  stage1: PowerPoint;
  stage2: PowerPoint | null;
}

/** Oturum açmış kullanıcılar için tam motor verisi (/catalog/engines/details). */
export interface Engine {
  id: string;
  label: string;
  engineNo: string | null;
  ecu: string | null;
  displacement: string | null;
  displacementCc: number | null;
  bore: string | null;
  compressionRatio: string | null;
  fuel: FuelType;
  tuningMethod: string | null;
  yearLabel: string | null;
  notes: string | null;
  stock: PowerPoint;
  stage1: PowerPoint;
  stage2: PowerPoint | null;
  stage3: PowerPoint | null;
}
export interface Service {
  code: string;
  label: string;
  description: string | null;
  kind: ServiceKind;
  price: number;
  category: string;
}
export interface TuningPrice {
  stage: TuningStage;
  price: number;
}
export interface ModifiedPart {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  listBrands(): Promise<Brand[]> {
    return firstValueFrom(this.http.get<Brand[]>(`${this.api}/catalog/brands`));
  }

  listModels(brandId: string): Promise<Model[]> {
    return firstValueFrom(
      this.http.get<Model[]>(`${this.api}/catalog/models`, { params: { brandId } }),
    );
  }

  listSeries(modelId: string): Promise<Series[]> {
    return firstValueFrom(
      this.http.get<Series[]>(`${this.api}/catalog/series`, { params: { modelId } }),
    );
  }

  listEngines(seriesId: string): Promise<EnginePublic[]> {
    return firstValueFrom(
      this.http.get<EnginePublic[]>(`${this.api}/catalog/engines`, { params: { seriesId } }),
    );
  }

  listEnginesDetailed(seriesId: string): Promise<Engine[]> {
    return firstValueFrom(
      this.http.get<Engine[]>(`${this.api}/catalog/engines/details`, { params: { seriesId } }),
    );
  }

  listServices(): Promise<Service[]> {
    return firstValueFrom(this.http.get<Service[]>(`${this.api}/catalog/services`));
  }

  listTuningPrices(): Promise<TuningPrice[]> {
    return firstValueFrom(
      this.http.get<TuningPrice[]>(`${this.api}/catalog/tuning-prices`),
    );
  }

  listModifiedParts(): Promise<ModifiedPart[]> {
    return firstValueFrom(
      this.http.get<ModifiedPart[]>(`${this.api}/catalog/modified-parts`),
    );
  }
}
