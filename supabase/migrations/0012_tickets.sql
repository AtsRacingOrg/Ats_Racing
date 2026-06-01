-- =============================================================================
-- ATS Racing — Destek sistemi: tickets + ticket_messages
-- Şema referansı: docs/DATABASE_SCHEMA.md §9
-- order_id opsiyonel: sipariş ile ilgili VEYA özel talep.
-- =============================================================================

do $$ begin create type ticket_status as enum ('open','pending','resolved'); exception when duplicate_object then null; end $$;
do $$ begin create type ticket_sender as enum ('user','support'); exception when duplicate_object then null; end $$;

create sequence if not exists tickets_seq start 1;

create table if not exists tickets (
  id          uuid primary key default gen_random_uuid(),
  ticket_no   text not null unique,
  user_id     uuid not null references profiles(id) on delete cascade,
  order_id    uuid references orders(id) on delete set null,
  subject     text not null,
  status      ticket_status not null default 'open',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tickets_user_idx on tickets (user_id, updated_at desc);
create index if not exists tickets_status_idx on tickets (status);

create table if not exists ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references tickets(id) on delete cascade,
  sender      ticket_sender not null,
  sender_id   uuid references profiles(id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists ticket_messages_ticket_idx on ticket_messages (ticket_id, created_at);

create or replace function bump_ticket_updated() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  update tickets set updated_at = now() where id = new.ticket_id;
  return new;
end $$;
drop trigger if exists trg_ticket_msg_bump on ticket_messages;
create trigger trg_ticket_msg_bump after insert on ticket_messages
  for each row execute function bump_ticket_updated();

create or replace function create_ticket(payload jsonb)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_tid uuid; v_tno text;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  v_tno := 'TKT-' || lpad(nextval('tickets_seq')::text, 3, '0');
  insert into tickets (ticket_no, user_id, order_id, subject, status)
    values (v_tno, v_uid, nullif(payload->>'orderId','')::uuid, payload->>'subject', 'open')
    returning id into v_tid;
  insert into ticket_messages (ticket_id, sender, sender_id, body)
    values (v_tid, 'user', v_uid, payload->>'message');
  return jsonb_build_object('id', v_tid, 'ticketNo', v_tno);
end $$;

create or replace function reply_ticket(p_ticket_id uuid, p_body text)
  returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if not exists (select 1 from tickets where id = p_ticket_id and user_id = v_uid) then
    raise exception 'not allowed';
  end if;
  insert into ticket_messages (ticket_id, sender, sender_id, body)
    values (p_ticket_id, 'user', v_uid, p_body);
  update tickets set status = case when status = 'resolved' then 'pending' else status end
    where id = p_ticket_id;
end $$;

alter table tickets enable row level security;
alter table ticket_messages enable row level security;

drop policy if exists tickets_select on tickets;
create policy tickets_select on tickets for select using (user_id = auth.uid() or is_admin());
drop policy if exists tickets_update_admin on tickets;
create policy tickets_update_admin on tickets for update using (is_admin()) with check (is_admin());

drop policy if exists ticket_messages_select on ticket_messages;
create policy ticket_messages_select on ticket_messages for select using (
  exists (select 1 from tickets t where t.id = ticket_id and (t.user_id = auth.uid() or is_admin())));
