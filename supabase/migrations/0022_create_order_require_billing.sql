-- =============================================================================
-- ATS Racing — Sipariş oluşturma: fatura bilgisi zorunlu
-- has_complete_billing() false ise create_order 'billing required' hatası verir.
-- =============================================================================

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

  if not has_complete_billing(v_uid) then
    raise exception 'billing required' using errcode = 'P0001';
  end if;

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

revoke execute on function create_order(jsonb) from public, anon;
grant execute on function create_order(jsonb) to authenticated;
