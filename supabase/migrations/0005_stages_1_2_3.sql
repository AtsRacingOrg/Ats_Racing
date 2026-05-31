-- =============================================================================
-- ATS Racing — Stage 1 / 1+ → Stage 1 / 2 / 3
-- engines: stage1plus kolonları (stage1 ile birebir aynı, gerçek veri değil)
--          kaldırılır; boş stage2 / stage3 kolonları eklenir. Veri girilince
--          UI'daki kilitli kartlar açılır.
-- tuning_stage enum: 'stage1','stage1_plus' → 'stage1','stage2','stage3'.
-- =============================================================================

-- ── engines: stage2 / stage3 kolonları ──────────────────────────────────────
alter table engines add column if not exists stage2_hp     int;
alter table engines add column if not exists stage2_torque int;
alter table engines add column if not exists stage3_hp     int;
alter table engines add column if not exists stage3_torque int;
alter table engines drop column if exists stage1plus_hp;
alter table engines drop column if exists stage1plus_torque;

-- ── tuning_stage enum yeniden oluşturulur ───────────────────────────────────
do $$
begin
  if exists (
    select 1 from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'tuning_stage' and e.enumlabel = 'stage1_plus'
  ) then
    delete from tuning_prices where stage::text = 'stage1_plus';

    create type tuning_stage_new as enum ('stage1', 'stage2', 'stage3');
    alter table tuning_prices
      alter column stage type tuning_stage_new using (stage::text::tuning_stage_new);
    drop type tuning_stage;
    alter type tuning_stage_new rename to tuning_stage;
  end if;
end $$;

insert into tuning_prices (stage, price) values
  ('stage1', 0), ('stage2', 0), ('stage3', 0)
on conflict (stage) do nothing;
