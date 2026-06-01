-- =============================================================================
-- ATS Racing — Sipariş sistemi: orders + alt tablolar + dosyalar + ödemeler
-- Şema referansı: docs/DATABASE_SCHEMA.md §6, §7, §8
-- Idempotent: tekrar çalıştırılabilir.
-- =============================================================================

-- ── ENUM'lar ────────────────────────────────────────────────────────────────
do $$ begin create type order_status     as enum ('pending','processing','completed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type file_kind        as enum ('original','delivered'); exception when duplicate_object then null; end $$;
do $$ begin create type file_status      as enum ('review','preparing','delivered'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_method   as enum ('card','transfer','dealer_credit'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_status   as enum ('pending','succeeded','failed','refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type statement_status as enum ('accruing','due','paid','overdue'); exception when duplicate_object then null; end $$;

-- ── Yardımcı: admin mı? ──────────────────────────────────────────────────────
create or replace function is_admin()
  returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ── Sayaç ────────────────────────────────────────────────────────────────────
create sequence if not exists orders_seq start 1;

-- ── dealer_statements (orders'tan önce — FK için) ────────────────────────────
create table if not exists dealer_statements (
  id            uuid primary key default gen_random_uuid(),
  statement_no  text not null unique,
  dealer_id     uuid not null references profiles(id) on delete cascade,
  period_year   int  not null,
  period_month  int  not null,
  due_date      date not null,
  status        statement_status not null default 'accruing',
  total         numeric(12,2) not null default 0,
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),
  unique (dealer_id, period_year, period_month)
);

-- ── orders ───────────────────────────────────────────────────────────────────
create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  order_no      text not null unique,
  user_id       uuid not null references profiles(id) on delete cascade,
  engine_id     uuid references engines(id) on delete set null,
  make          text,
  model         text,
  year          int,
  engine_label  text,
  fuel          fuel_type,
  transmission  text,
  vin           text,
  km            text,
  stage         tuning_stage not null,
  ecu           text,
  reading_tool  text,
  virtual_file  boolean not null default false,
  dyno          boolean not null default false,
  ecu_hw        text,
  ecu_part      text,
  ecu_sw        text,
  modified_parts text[] not null default '{}',
  base_price    numeric(12,2) not null default 0,
  extras_total  numeric(12,2) not null default 0,
  total_price   numeric(12,2) not null default 0,
  status        order_status not null default 'pending',
  notes         text,
  statement_id  uuid references dealer_statements(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists orders_user_created_idx on orders (user_id, created_at desc);
create index if not exists orders_status_idx        on orders (status);
create index if not exists orders_statement_idx     on orders (statement_id);

-- ── order_items ──────────────────────────────────────────────────────────────
create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  service_id  uuid references service_catalog(id) on delete set null,
  label       text not null,
  unit_price  numeric(12,2) not null default 0
);
create index if not exists order_items_order_idx on order_items (order_id);

-- ── order_pcodes ─────────────────────────────────────────────────────────────
create table if not exists order_pcodes (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  pcode       text,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists order_pcodes_order_idx on order_pcodes (order_id);

-- ── order_events (timeline) ──────────────────────────────────────────────────
create table if not exists order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  event       text not null,
  actor_role  user_role,
  actor_id    uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists order_events_order_idx on order_events (order_id, created_at);

-- ── tuning_files ─────────────────────────────────────────────────────────────
create table if not exists tuning_files (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  kind            file_kind not null,
  file_name       text not null,
  storage_path    text not null,
  type            text,
  status          file_status not null default 'review',
  is_downloadable boolean not null default false,
  amount          numeric(12,2),
  delivery_date   timestamptz,
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists tuning_files_order_idx on tuning_files (order_id);
create index if not exists tuning_files_user_idx  on tuning_files (user_id);

-- ── payments ─────────────────────────────────────────────────────────────────
create table if not exists payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  order_id      uuid references orders(id) on delete cascade,
  statement_id  uuid references dealer_statements(id) on delete set null,
  amount        numeric(12,2) not null,
  method        payment_method not null,
  status        payment_status not null default 'pending',
  provider_ref  text,
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),
  constraint payments_target_chk check (order_id is not null or statement_id is not null)
);
create index if not exists payments_user_idx      on payments (user_id);
create index if not exists payments_statement_idx on payments (statement_id);

-- ── Bayi ekstre toplamı trigger'ı ────────────────────────────────────────────
create or replace function update_statement_total() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and old.statement_id is distinct from new.statement_id
     and old.statement_id is not null then
    update dealer_statements s
      set total = coalesce((select sum(total_price) from orders where statement_id = old.statement_id), 0)
      where s.id = old.statement_id;
  end if;
  if new.statement_id is not null then
    update dealer_statements s
      set total = coalesce((select sum(total_price) from orders where statement_id = new.statement_id), 0)
      where s.id = new.statement_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_order_statement_total on orders;
create trigger trg_order_statement_total
  after insert or update of statement_id, total_price on orders
  for each row execute function update_statement_total();

-- ── Atomik sipariş oluşturma ─────────────────────────────────────────────────
-- İstemci fiyat belirlemez; base_price tuning_prices'tan, extras service_catalog'tan
-- server-side hesaplanır ve snapshot'lanır.
create or replace function create_order(payload jsonb)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_role  user_role;
  v_oid   uuid;
  v_ono   text;
  v_stage tuning_stage;
  v_base  numeric(12,2);
  v_extra numeric(12,2) := 0;
  v_codes text[];
  v_svc   record;
  v_pc    jsonb;
  v_sid   uuid;
  v_y int; v_m int;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select role into v_role from profiles where id = v_uid;
  if v_role is null then raise exception 'profile not found'; end if;

  v_stage := (payload->>'stage')::tuning_stage;
  select coalesce(price, 0) into v_base from tuning_prices where stage = v_stage;
  v_base := coalesce(v_base, 0);
  v_ono  := 'ORD-' || lpad(nextval('orders_seq')::text, 3, '0');
  v_codes := coalesce((select array_agg(value) from jsonb_array_elements_text(payload->'serviceCodes')), '{}');

  insert into orders (
    order_no, user_id, engine_id, make, model, year, engine_label, fuel, transmission,
    vin, km, stage, ecu, reading_tool, virtual_file, dyno, ecu_hw, ecu_part, ecu_sw,
    modified_parts, base_price, extras_total, total_price, status, notes
  ) values (
    v_ono, v_uid, nullif(payload->>'engineId','')::uuid, payload->>'make', payload->>'model',
    nullif(payload->>'year','')::int, payload->>'engineLabel',
    nullif(payload->>'fuel','')::fuel_type, payload->>'transmission',
    payload->>'vin', payload->>'km', v_stage, payload->>'ecu', payload->>'readingTool',
    coalesce((payload->>'virtualFile')::boolean, false),
    coalesce((payload->>'dyno')::boolean, false),
    payload->>'ecuHw', payload->>'ecuPart', payload->>'ecuSw',
    coalesce((select array_agg(value) from jsonb_array_elements_text(payload->'modifiedParts')), '{}'),
    v_base, 0, v_base, 'pending', payload->>'notes'
  ) returning id into v_oid;

  for v_svc in
    select id, label, price from service_catalog where code = any(v_codes) and is_active = true
  loop
    insert into order_items (order_id, service_id, label, unit_price)
      values (v_oid, v_svc.id, v_svc.label, v_svc.price);
    v_extra := v_extra + coalesce(v_svc.price, 0);
  end loop;

  for v_pc in select * from jsonb_array_elements(coalesce(payload->'pcodes', '[]'::jsonb))
  loop
    insert into order_pcodes (order_id, pcode, note) values (v_oid, v_pc->>'pcode', v_pc->>'note');
  end loop;

  update orders set extras_total = v_extra, total_price = v_base + v_extra where id = v_oid;

  insert into order_events (order_id, event, actor_role, actor_id)
    values (v_oid, 'Sipariş oluşturuldu', v_role, v_uid);

  if v_role = 'dealer' then
    v_y := extract(year from now())::int;
    v_m := extract(month from now())::int;
    insert into dealer_statements (statement_no, dealer_id, period_year, period_month, due_date, status)
      values ('EXT-' || v_y || '-' || lpad(v_m::text, 2, '0'), v_uid, v_y, v_m,
              (date_trunc('month', now()) + interval '1 month')::date, 'accruing')
      on conflict (dealer_id, period_year, period_month) do nothing;
    select id into v_sid from dealer_statements where dealer_id = v_uid and period_year = v_y and period_month = v_m;
    update orders set statement_id = v_sid where id = v_oid;
  else
    insert into payments (user_id, order_id, amount, method, status)
      values (v_uid, v_oid, v_base + v_extra, 'card', 'pending');
  end if;

  return jsonb_build_object('id', v_oid, 'orderNo', v_ono, 'total', v_base + v_extra);
end $$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table dealer_statements enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;
alter table order_pcodes      enable row level security;
alter table order_events      enable row level security;
alter table tuning_files      enable row level security;
alter table payments          enable row level security;

drop policy if exists orders_select on orders;
create policy orders_select on orders for select using (user_id = auth.uid() or is_admin());
drop policy if exists orders_update_admin on orders;
create policy orders_update_admin on orders for update using (is_admin()) with check (is_admin());

drop policy if exists order_items_select on order_items;
create policy order_items_select on order_items for select using (
  exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
drop policy if exists order_pcodes_select on order_pcodes;
create policy order_pcodes_select on order_pcodes for select using (
  exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
drop policy if exists order_events_select on order_events;
create policy order_events_select on order_events for select using (
  exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));

drop policy if exists tuning_files_select on tuning_files;
create policy tuning_files_select on tuning_files for select using (user_id = auth.uid() or is_admin());

drop policy if exists dealer_statements_select on dealer_statements;
create policy dealer_statements_select on dealer_statements for select using (dealer_id = auth.uid() or is_admin());

drop policy if exists payments_select on payments;
create policy payments_select on payments for select using (user_id = auth.uid() or is_admin());

-- ── Storage bucket (private) ─────────────────────────────────────────────────
-- Dosya erişimi API üzerinden service-role ile yapılır (yükleme + imzalı indirme),
-- bu yüzden object-level RLS politikası eklenmez.
insert into storage.buckets (id, name, public) values ('tuning-files', 'tuning-files', false)
  on conflict (id) do nothing;
