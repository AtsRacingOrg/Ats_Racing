/**
 * ATS Racing — Araç & Motor kataloğu import scripti.
 *
 * NDJSON (scripts/xlsx-to-ndjson.py çıktısı) okur ve şu tabloları doldurur:
 *   brands → models → series → engines → engine_services
 * DATABASE_SCHEMA.md §4.5 eşlemesine ve kullanıcı kararlarına göre:
 *   - 10 yakıt değeri korunur (fuel_type enum)
 *   - yalnızca Stage 1 + Stage 1+ (Stage 2/3 yok)
 *   - "Motor Numarası" → engine_no; ecu boş bırakılır
 *   - " CC" sıyrılır, Avrupa ondalıkları korunur (bore/compression metin)
 *   - "Ek Seçenekler" virgülle ayrılıp service_catalog ile eşlenir → engine_services
 *   - source_path idempotency anahtarıdır (tekrar çalıştırma güvenli)
 *
 * Çalıştırma:
 *   python3 scripts/xlsx-to-ndjson.py \
 *     /Users/kutaykarademir/Downloads/arac_detayli_atmchiptuning_listesi.xlsx \
 *     /tmp/catalog.ndjson
 *   npx tsx scripts/import-catalog.ts /tmp/catalog.ndjson
 *
 * Gerekli env (.env): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (service_role RLS'i bypass eder — script güvenli ortamda çalıştırılmalı.)
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// ── env ─────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('HATA: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env içinde olmalı.');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── tipler ──────────────────────────────────────────────────────────────────
interface Raw {
  source_path: string; brand: string; model: string; nesil: string;
  engine_label: string; fuel: string; tuning_method: string; engine_no: string;
  displacement_cc: string; bore: string; compression_ratio: string;
  stock_hp: string; stock_torque: string; total_stage: string;
  options: string; notes: string;
  stage1_hp: string; stage1_torque: string;
  stage1plus_hp: string; stage1plus_torque: string;
}

// ── dönüşümler ────────────────────────────────────────────────────────────────
const FUEL_MAP: Record<string, string> = {
  'Benzine': 'petrol',
  'Diesel': 'diesel',
  'Benzine MHEV': 'petrol_mhev',
  'Benzine PHEV': 'petrol_phev',
  'Benzine Hybride': 'petrol_hybrid',
  'Diesel MHEV': 'diesel_mhev',
  'Diesel PHEV': 'diesel_phev',
  'Diesel Hybride': 'diesel_hybrid',
  'EV': 'ev',
  'LPG': 'lpg',
};

// "Ek Seçenekler" ham NL metin → service_catalog.code (0002_catalog.sql ile eşleşir)
const OPTION_MAP: Record<string, string> = {
  "Foutcodes / Verwijderen van DTC's": 'dtc',
  'Vmax': 'vmax',
  'Swirl Flaps': 'swirl_flaps',
  'START/STOP Uitschakeling': 'start_stop',
  'Pop & Bang Crackle map': 'pop_bang',
  'EGR uitschakeling': 'egr',
  'DECAT': 'decat',
  'Anti lag': 'anti_lag',
  'Launch control': 'launch_control',
};

const slugify = (s: string): string =>
  s.toLowerCase().trim()
    .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const toInt = (s: string): number | null => {
  const m = (s || '').replace(/[^\d]/g, '');
  return m ? parseInt(m, 10) : null;
};

function parseYears(nesil: string): { year_from: number | null; year_to: number | null } {
  const years = (nesil || '').match(/\d{4}/g);
  if (!years) return { year_from: null, year_to: null };
  return {
    year_from: parseInt(years[0], 10),
    year_to: years[1] ? parseInt(years[1], 10) : null, // "2016 ->" → açık uç
  };
}

const unknownFuels = new Set<string>();
const unknownOptions = new Set<string>();

function mapFuel(f: string): string {
  const v = FUEL_MAP[f.trim()];
  if (!v) { unknownFuels.add(f); return 'petrol'; }
  return v;
}

// supabase 1000 satır limiti olduğundan büyük tabloları sayfalayarak çeker
async function fetchAll<T>(table: string, cols: string): Promise<T[]> {
  const out: T[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select(cols).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table} okuma hatası: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function upsertChunked(
  table: string, rows: Record<string, unknown>[], onConflict: string,
): Promise<void> {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await db.from(table).upsert(slice, { onConflict, ignoreDuplicates: false });
    if (error) throw new Error(`${table} upsert hatası: ${error.message}`);
    process.stdout.write(`  ${table}: ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`);
  }
  process.stdout.write('\n');
}

// ── ana akış ──────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) {
    console.error('Kullanım: npx tsx scripts/import-catalog.ts <catalog.ndjson>');
    process.exit(1);
  }

  const records: Raw[] = readFileSync(file, 'utf-8')
    .split('\n').filter(Boolean).map((l) => JSON.parse(l) as Raw);
  console.log(`${records.length} satır okundu.`);

  // service_catalog code → id (SQL seed'inden gelmeli)
  const services = await fetchAll<{ id: string; code: string }>('service_catalog', 'id, code');
  const serviceByCode = new Map(services.map((s) => [s.code, s.id]));
  if (serviceByCode.size === 0) {
    console.error('HATA: service_catalog boş. Önce 0002_catalog.sql migration\'ını uygulayın.');
    process.exit(1);
  }

  // 1) brands ────────────────────────────────────────────────────────────────
  const brandNames = [...new Set(records.map((r) => r.brand).filter(Boolean))];
  await upsertChunked('brands',
    brandNames.map((name) => ({ name, slug: slugify(name) })), 'name');
  const brands = await fetchAll<{ id: string; name: string }>('brands', 'id, name');
  const brandId = new Map(brands.map((b) => [b.name, b.id]));

  // 2) models (brand_id, name) ─────────────────────────────────────────────────
  const modelKey = new Map<string, { brand_id: string; name: string }>();
  for (const r of records) {
    if (!r.brand || !r.model) continue;
    const bid = brandId.get(r.brand)!;
    modelKey.set(`${bid}|${r.model}`, { brand_id: bid, name: r.model });
  }
  await upsertChunked('models', [...modelKey.values()], 'brand_id,name');
  const models = await fetchAll<{ id: string; brand_id: string; name: string }>(
    'models', 'id, brand_id, name');
  const modelId = new Map(models.map((m) => [`${m.brand_id}|${m.name}`, m.id]));

  // 3) series (model_id, name) — name = Nesil metni ─────────────────────────────
  const seriesKey = new Map<string, Record<string, unknown>>();
  for (const r of records) {
    if (!r.brand || !r.model) continue;
    const bid = brandId.get(r.brand)!;
    const mid = modelId.get(`${bid}|${r.model}`)!;
    const name = r.nesil || '—';
    const { year_from, year_to } = parseYears(r.nesil);
    seriesKey.set(`${mid}|${name}`, {
      model_id: mid, name, year_label: r.nesil || null, year_from, year_to,
    });
  }
  await upsertChunked('series', [...seriesKey.values()], 'model_id,name');
  const series = await fetchAll<{ id: string; model_id: string; name: string }>(
    'series', 'id, model_id, name');
  const seriesId = new Map(series.map((s) => [`${s.model_id}|${s.name}`, s.id]));

  // 4) engines (source_path idempotency) ────────────────────────────────────────
  const engineRows = records
    .filter((r) => r.source_path && r.brand && r.model)
    .map((r) => {
      const bid = brandId.get(r.brand)!;
      const mid = modelId.get(`${bid}|${r.model}`)!;
      const sid = seriesId.get(`${mid}|${r.nesil || '—'}`)!;
      return {
        series_id: sid,
        label: r.engine_label || r.source_path,
        engine_no: r.engine_no || null,
        ecu: null,
        displacement_cc: toInt(r.displacement_cc),
        bore: r.bore || null,
        compression_ratio: r.compression_ratio || null,
        fuel: mapFuel(r.fuel),
        tuning_method: r.tuning_method || null,
        year_label: r.nesil || null,
        notes: r.notes || null,
        source_path: r.source_path,
        stock_hp: toInt(r.stock_hp),
        stock_torque: toInt(r.stock_torque),
        stage1_hp: toInt(r.stage1_hp),
        stage1_torque: toInt(r.stage1_torque),
        stage1plus_hp: toInt(r.stage1plus_hp),
        stage1plus_torque: toInt(r.stage1plus_torque),
      };
    });
  await upsertChunked('engines', engineRows, 'source_path');
  const engines = await fetchAll<{ id: string; source_path: string }>(
    'engines', 'id, source_path');
  const engineId = new Map(engines.map((e) => [e.source_path, e.id]));

  // 5) engine_services ("Ek Seçenekler" → service_catalog) ──────────────────────
  const linkSet = new Set<string>();
  const links: { engine_id: string; service_id: string }[] = [];
  for (const r of records) {
    if (!r.source_path || !r.options) continue;
    const eid = engineId.get(r.source_path);
    if (!eid) continue;
    for (const optRaw of r.options.split(',')) {
      const opt = optRaw.trim();
      if (!opt) continue;
      const code = OPTION_MAP[opt];
      if (!code) { unknownOptions.add(opt); continue; }
      const sid = serviceByCode.get(code);
      if (!sid) continue;
      const key = `${eid}|${sid}`;
      if (linkSet.has(key)) continue;
      linkSet.add(key);
      links.push({ engine_id: eid, service_id: sid });
    }
  }
  await upsertChunked('engine_services', links, 'engine_id,service_id');

  // ── özet ────────────────────────────────────────────────────────────────────
  console.log('\n✓ İçe aktarma tamamlandı.');
  console.log(`  brands:          ${brandNames.length}`);
  console.log(`  models:          ${modelKey.size}`);
  console.log(`  series:          ${seriesKey.size}`);
  console.log(`  engines:         ${engineRows.length}`);
  console.log(`  engine_services: ${links.length}`);
  if (unknownFuels.size) console.warn(`  ⚠ bilinmeyen yakıt (petrol'e düştü): ${[...unknownFuels].join(', ')}`);
  if (unknownOptions.size) console.warn(`  ⚠ eşlenemeyen seçenek (atlandı): ${[...unknownOptions].join(', ')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
