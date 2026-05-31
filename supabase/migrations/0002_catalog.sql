-- =============================================================================
-- ATS Racing — Araç & Servis Kataloğu şeması
-- DATABASE_SCHEMA.md §2 (enum'lar), §4 (araç/motor kataloğu), §5 (servis kataloğu)
-- Idempotent: tekrar çalıştırılabilir (if not exists / on conflict).
-- =============================================================================

-- ── 2. Enum'lar (yalnızca katalogla ilgili olanlar) ─────────────────────────
do $$ begin
  create type fuel_type as enum (
    'petrol', 'diesel',
    'petrol_mhev', 'petrol_phev', 'petrol_hybrid',
    'diesel_mhev', 'diesel_phev', 'diesel_hybrid',
    'ev', 'lpg'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type tuning_stage as enum ('stage1', 'stage1_plus');
exception when duplicate_object then null; end $$;

do $$ begin
  create type service_kind as enum ('module', 'extra');
exception when duplicate_object then null; end $$;

-- ── 4.1 brands ──────────────────────────────────────────────────────────────
create table if not exists brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  logo_url    text,
  sort_order  int  not null default 0,
  is_active   boolean not null default true
);

-- ── 4.2 models ──────────────────────────────────────────────────────────────
create table if not exists models (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references brands(id) on delete cascade,
  name        text not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  constraint models_brand_name_uniq unique (brand_id, name)
);

-- ── 4.3 series ──────────────────────────────────────────────────────────────
create table if not exists series (
  id          uuid primary key default gen_random_uuid(),
  model_id    uuid not null references models(id) on delete cascade,
  name        text not null,
  year_label  text,
  year_from   int,
  year_to     int,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  constraint series_model_name_uniq unique (model_id, name)
);

-- ── 4.4 engines ─────────────────────────────────────────────────────────────
create table if not exists engines (
  id                uuid primary key default gen_random_uuid(),
  series_id         uuid not null references series(id) on delete cascade,
  label             text not null,
  engine_no         text,          -- H: Motor Numarası (ECU değil)
  ecu               text,          -- veride yok; sonradan doldurulur
  displacement      text,          -- türetilebilir "1.4L Turbo"
  displacement_cc   int,           -- I: "1368 CC" → 1368
  bore              text,          -- J: Boring X Slag
  compression_ratio text,          -- K
  fuel              fuel_type not null,
  tuning_method     text,          -- G
  year_label        text,          -- D: Nesil
  notes             text,          -- P: Ek Bilgiler
  source_path       text unique,   -- A: Klasör Yolu — import idempotency anahtarı
  stock_hp          int,
  stock_torque      int,
  stage1_hp         int,
  stage1_torque     int,
  stage1plus_hp     int,
  stage1plus_torque int,
  is_active         boolean not null default true
);

create index if not exists engines_series_idx on engines(series_id);

-- ── 5.1 service_categories ──────────────────────────────────────────────────
create table if not exists service_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort_order  int  not null default 0
);

-- ── 5.2 service_catalog ─────────────────────────────────────────────────────
create table if not exists service_catalog (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  label       text not null,
  description text,
  kind        service_kind not null,
  category_id uuid references service_categories(id),
  price       numeric(12,2) not null default 0,
  is_active   boolean not null default true
);

-- ── 5.3 tuning_prices ───────────────────────────────────────────────────────
create table if not exists tuning_prices (
  stage       tuning_stage primary key,
  price       numeric(12,2) not null default 0,
  updated_at  timestamptz not null default now()
);

-- ── 5.4 engine_services (araç ↔ sunulabilen ek servis) ──────────────────────
create table if not exists engine_services (
  engine_id   uuid not null references engines(id) on delete cascade,
  service_id  uuid not null references service_catalog(id) on delete cascade,
  primary key (engine_id, service_id)
);

-- =============================================================================
-- Seed: servis kategorileri + servis kataloğu ("Ek Seçenekler" 9 değer)
-- =============================================================================
insert into service_categories (name, sort_order) values
  ('Emisyon', 1), ('Motor', 2), ('Performans', 3),
  ('Konfor', 4), ('Egzoz', 5), ('Güvenlik', 6)
on conflict (name) do nothing;

insert into service_catalog (code, label, description, kind, category_id, price) values
  ('dtc',           'DTC / Hata Kodu Silme',  'Foutcodes / Verwijderen van DTC''s', 'extra',
     (select id from service_categories where name = 'Motor'), 0),
  ('vmax',          'VMAX (Hız Limiti Kaldırma)', 'Maksimum hız limitinin kaldırılması', 'extra',
     (select id from service_categories where name = 'Performans'), 0),
  ('swirl_flaps',   'Swirl Flaps Kapatma',    'Emme manifoldu girdap kapakları devre dışı', 'extra',
     (select id from service_categories where name = 'Motor'), 0),
  ('start_stop',    'Start/Stop Kapatma',     'START/STOP Uitschakeling', 'extra',
     (select id from service_categories where name = 'Konfor'), 0),
  ('pop_bang',      'Pop & Bang / Crackle',   'Pop & Bang Crackle map', 'extra',
     (select id from service_categories where name = 'Egzoz'), 0),
  ('egr',           'EGR Kapatma',            'EGR uitschakeling', 'extra',
     (select id from service_categories where name = 'Emisyon'), 0),
  ('decat',         'DECAT (Katalizör Kaldırma)', 'Katalizör devre dışı', 'extra',
     (select id from service_categories where name = 'Egzoz'), 0),
  ('anti_lag',      'Anti-Lag',               'Anti lag sistemi', 'extra',
     (select id from service_categories where name = 'Performans'), 0),
  ('launch_control','Launch Control',         'Kalkış kontrolü', 'extra',
     (select id from service_categories where name = 'Performans'), 0)
on conflict (code) do nothing;

insert into tuning_prices (stage, price) values
  ('stage1', 0), ('stage1_plus', 0)
on conflict (stage) do nothing;

-- =============================================================================
-- RLS: katalog herkese okunur; yazma yalnızca admin (profiles.role = 'admin').
-- =============================================================================
alter table brands             enable row level security;
alter table models             enable row level security;
alter table series             enable row level security;
alter table engines            enable row level security;
alter table service_categories enable row level security;
alter table service_catalog    enable row level security;
alter table tuning_prices      enable row level security;
alter table engine_services    enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'brands','models','series','engines',
    'service_categories','service_catalog','tuning_prices','engine_services'
  ] loop
    -- public read
    execute format(
      'drop policy if exists %1$s_read on %1$s;
       create policy %1$s_read on %1$s for select using (true);', t);
    -- admin write
    execute format(
      'drop policy if exists %1$s_admin_write on %1$s;
       create policy %1$s_admin_write on %1$s for all
         using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = ''admin''))
         with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = ''admin''));', t);
  end loop;
end $$;
