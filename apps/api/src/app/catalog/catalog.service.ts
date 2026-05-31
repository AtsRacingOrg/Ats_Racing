import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  BrandRow,
  BrandView,
  EngineRow,
  EngineView,
  ModelRow,
  ModelView,
  ModifiedPartRow,
  ModifiedPartView,
  SeriesRow,
  SeriesView,
  ServiceRow,
  ServiceView,
  TuningPriceRow,
  TuningPriceView,
  toEngineView,
  toServiceView,
  toTuningPriceView,
} from './catalog.types';

/**
 * Araç & servis kataloğunu okur. Katalog RLS'te herkese açık (public read);
 * burada service-role client'ı okuma için kullanmak güvenli — yalnızca SELECT.
 */
@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async listBrands(): Promise<BrandView[]> {
    const { data, error } = await this.supabase.admin
      .from('brands')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .returns<BrandRow[]>();
    this.guard(error, 'Markalar getirilemedi.');
    return (data ?? []).map((b) => ({ id: b.id, name: b.name }));
  }

  async listModels(brandId: string): Promise<ModelView[]> {
    const { data, error } = await this.supabase.admin
      .from('models')
      .select('id, name')
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .returns<ModelRow[]>();
    this.guard(error, 'Modeller getirilemedi.');
    return (data ?? []).map((m) => ({ id: m.id, name: m.name }));
  }

  async listSeries(modelId: string): Promise<SeriesView[]> {
    const { data, error } = await this.supabase.admin
      .from('series')
      .select('id, name, year_label, year_from, year_to')
      .eq('model_id', modelId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .returns<SeriesRow[]>();
    this.guard(error, 'Nesiller getirilemedi.');
    return (data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      yearLabel: s.year_label,
      yearFrom: s.year_from,
      yearTo: s.year_to,
    }));
  }

  async listEngines(seriesId: string): Promise<EngineView[]> {
    const { data, error } = await this.supabase.admin
      .from('engines')
      .select(
        'id, label, engine_no, ecu, displacement, displacement_cc, bore, ' +
          'compression_ratio, fuel, tuning_method, year_label, notes, ' +
          'stock_hp, stock_torque, stage1_hp, stage1_torque, ' +
          'stage2_hp, stage2_torque, stage3_hp, stage3_torque',
      )
      .eq('series_id', seriesId)
      .eq('is_active', true)
      .order('stock_hp', { ascending: true })
      .returns<EngineRow[]>();
    this.guard(error, 'Motorlar getirilemedi.');
    return (data ?? []).map(toEngineView);
  }

  async listServices(): Promise<ServiceView[]> {
    const { data, error } = await this.supabase.admin
      .from('service_catalog')
      .select('code, label, description, kind, price, category:service_categories(name)')
      .eq('is_active', true)
      .returns<ServiceRow[]>();
    this.guard(error, 'Servisler getirilemedi.');
    return (data ?? []).map(toServiceView);
  }

  async listModifiedParts(): Promise<ModifiedPartView[]> {
    const { data, error } = await this.supabase.admin
      .from('modified_parts')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .returns<ModifiedPartRow[]>();
    this.guard(error, 'Değiştirilmiş parçalar getirilemedi.');
    return (data ?? []).map((p) => ({ id: p.id, name: p.name }));
  }

  async listTuningPrices(): Promise<TuningPriceView[]> {
    const { data, error } = await this.supabase.admin
      .from('tuning_prices')
      .select('stage, price')
      .returns<TuningPriceRow[]>();
    this.guard(error, 'Fiyatlar getirilemedi.');
    return (data ?? []).map(toTuningPriceView);
  }

  private guard(error: { message: string } | null, msg: string): void {
    if (error) {
      this.logger.error(`${msg} (${error.message})`);
      throw new InternalServerErrorException(msg);
    }
  }
}
