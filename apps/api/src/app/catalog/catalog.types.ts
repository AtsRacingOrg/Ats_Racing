/**
 * Katalog DB satırları (snake_case) → API view (camelCase) eşlemeleri.
 * Şema referansı: docs/DATABASE_SCHEMA.md §4 (araç/motor) ve §5 (servis kataloğu).
 */

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

/* ─── DB satır tipleri ─── */
export interface BrandRow {
  id: string;
  name: string;
}
export interface ModelRow {
  id: string;
  name: string;
}
export interface SeriesRow {
  id: string;
  name: string;
  year_label: string | null;
  year_from: number | null;
  year_to: number | null;
}
export interface EngineRow {
  id: string;
  label: string;
  engine_no: string | null;
  ecu: string | null;
  displacement: string | null;
  displacement_cc: number | null;
  bore: string | null;
  compression_ratio: string | null;
  fuel: FuelType;
  tuning_method: string | null;
  year_label: string | null;
  notes: string | null;
  stock_hp: number | null;
  stock_torque: number | null;
  stage1_hp: number | null;
  stage1_torque: number | null;
  stage2_hp: number | null;
  stage2_torque: number | null;
  stage3_hp: number | null;
  stage3_torque: number | null;
}
export interface ServiceRow {
  code: string;
  label: string;
  description: string | null;
  kind: ServiceKind;
  price: string | number;
  category: { name: string } | null;
}
export interface TuningPriceRow {
  stage: TuningStage;
  price: string | number;
}
export interface ModifiedPartRow {
  id: string;
  name: string;
}

/* ─── API view tipleri (frontend tüketir) ─── */
export interface BrandView {
  id: string;
  name: string;
}
export interface ModelView {
  id: string;
  name: string;
}
export interface SeriesView {
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

/** Herkese açık uçta dönen kısıtlı motor verisi — hassas teknik detaylar yok. */
export interface EnginePublicView {
  id: string;
  label: string;
  fuel: FuelType;
  displacementCc: number | null;
  stock: PowerPoint;
  stage1: PowerPoint;
  stage2: PowerPoint | null;
}

/** Kimliği doğrulanmış kullanıcılara dönen tam motor verisi. */
export interface EngineView {
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
export interface ServiceView {
  code: string;
  label: string;
  description: string | null;
  kind: ServiceKind;
  price: number;
  category: string;
}
export interface TuningPriceView {
  stage: TuningStage;
  price: number;
}
export interface ModifiedPartView {
  id: string;
  name: string;
}

/* ─── Mapper'lar ─── */
const power = (hp: number | null, torque: number | null): PowerPoint => ({
  hp: hp ?? 0,
  torque: torque ?? 0,
});

export function toEnginePublicView(r: Pick<EngineRow, 'id' | 'label' | 'fuel' | 'displacement_cc' | 'stock_hp' | 'stock_torque' | 'stage1_hp' | 'stage1_torque' | 'stage2_hp' | 'stage2_torque'>): EnginePublicView {
  const hasStage2 = r.stage2_hp != null || r.stage2_torque != null;
  return {
    id: r.id,
    label: r.label,
    fuel: r.fuel,
    displacementCc: r.displacement_cc,
    stock: power(r.stock_hp, r.stock_torque),
    stage1: power(r.stage1_hp, r.stage1_torque),
    stage2: hasStage2 ? power(r.stage2_hp, r.stage2_torque) : null,
  };
}

export function toEngineView(r: EngineRow): EngineView {
  const hasStage2 = r.stage2_hp != null || r.stage2_torque != null;
  const hasStage3 = r.stage3_hp != null || r.stage3_torque != null;
  return {
    id: r.id,
    label: r.label,
    engineNo: r.engine_no,
    ecu: r.ecu,
    displacement: r.displacement,
    displacementCc: r.displacement_cc,
    bore: r.bore,
    compressionRatio: r.compression_ratio,
    fuel: r.fuel,
    tuningMethod: r.tuning_method,
    yearLabel: r.year_label,
    notes: r.notes,
    stock: power(r.stock_hp, r.stock_torque),
    stage1: power(r.stage1_hp, r.stage1_torque),
    stage2: hasStage2 ? power(r.stage2_hp, r.stage2_torque) : null,
    stage3: hasStage3 ? power(r.stage3_hp, r.stage3_torque) : null,
  };
}

export function toServiceView(r: ServiceRow): ServiceView {
  return {
    code: r.code,
    label: r.label,
    description: r.description,
    kind: r.kind,
    price: Number(r.price),
    category: r.category?.name ?? 'Diğer',
  };
}

export function toTuningPriceView(r: TuningPriceRow): TuningPriceView {
  return { stage: r.stage, price: Number(r.price) };
}
