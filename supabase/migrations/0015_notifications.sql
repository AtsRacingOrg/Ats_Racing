-- =============================================================================
-- ATS Racing — Bildirim sistemi
-- Kullanıcı / bayi / admin için event bazlı bildirimler. Üretim:
--   * Sipariş açıldığında: sahip + tüm adminler için bildirim
--   * Sipariş statüsü 'completed' veya 'cancelled' olduğunda: sahip bildirilir
--   * Ticket açıldığında: tüm adminler bildirilir
--   * Ticket mesajı geldiğinde: karşı taraf bildirilir (admin/user)
-- Bildirimler okunmamış sayım hem üst bar zilinde hem menü rozetlerinde
-- ('orders' / 'tickets' kategorisi) kullanılır.
-- =============================================================================

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  category    text not null,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_created_idx
  on notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on notifications (user_id) where read_at is null;

alter table notifications enable row level security;

drop policy if exists notifications_select on notifications;
create policy notifications_select on notifications
  for select using (user_id = auth.uid());

drop policy if exists notifications_update on notifications;
create policy notifications_update on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Triggers ────────────────────────────────────────────────────────────────

-- Sipariş oluşturulduğunda
create or replace function public.on_order_created()
  returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_customer text;
begin
  -- Müşteriye onay bildirimi
  insert into notifications (user_id, type, title, body, category, link)
  values (
    new.user_id,
    'order_received',
    'Siparişiniz alındı',
    'Sipariş #' || new.order_no || ' kaydedildi. Hazırlanmaya başlandığında bilgilendirileceksiniz.',
    'orders',
    '/dashboard/orders'
  );
  -- Adminlere yeni sipariş bildirimi
  select coalesce(full_name, email, '—') into v_customer from profiles where id = new.user_id;
  insert into notifications (user_id, type, title, body, category, link)
  select p.id, 'new_order',
         'Yeni sipariş geldi',
         'Sipariş #' || new.order_no || ' — ' || coalesce(v_customer, '—'),
         'orders',
         '/admin/orders'
    from profiles p where p.role = 'admin';
  return new;
end $$;

drop trigger if exists trg_order_created_notify on orders;
create trigger trg_order_created_notify
  after insert on orders
  for each row execute function public.on_order_created();

-- Sipariş statüsü değiştiğinde (sahibe)
create or replace function public.on_order_status_changed()
  returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'completed' then
      insert into notifications (user_id, type, title, body, category, link)
      values (new.user_id, 'order_completed',
              'Siparişiniz tamamlandı',
              'Sipariş #' || new.order_no || ' tamamlandı. Dosyanızı indirebilirsiniz.',
              'orders', '/dashboard/orders');
    elsif new.status = 'cancelled' then
      insert into notifications (user_id, type, title, body, category, link)
      values (new.user_id, 'order_cancelled',
              'Siparişiniz iptal edildi',
              'Sipariş #' || new.order_no || ' iptal edildi.' ||
              case when coalesce(new.cancellation_reason, '') <> ''
                   then ' Sebep: ' || new.cancellation_reason else '' end,
              'orders', '/dashboard/orders');
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_order_status_notify on orders;
create trigger trg_order_status_notify
  after update of status on orders
  for each row execute function public.on_order_status_changed();

-- Ticket oluşturulduğunda → adminlere
create or replace function public.on_ticket_created()
  returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_customer text;
begin
  select coalesce(full_name, email, '—') into v_customer from profiles where id = new.user_id;
  insert into notifications (user_id, type, title, body, category, link)
  select p.id, 'new_ticket',
         'Yeni destek talebi',
         new.ticket_no || ' — ' || coalesce(v_customer, '—') || ': ' || new.subject,
         'tickets', '/admin/tickets'
    from profiles p where p.role = 'admin';
  return new;
end $$;

drop trigger if exists trg_ticket_created_notify on tickets;
create trigger trg_ticket_created_notify
  after insert on tickets
  for each row execute function public.on_ticket_created();

-- Ticket mesajı eklendiğinde → karşı tarafa
create or replace function public.on_ticket_message_created()
  returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner_id uuid;
  v_ticket_no text;
  v_subject text;
  v_msg_count int;
begin
  select user_id, ticket_no, subject into v_owner_id, v_ticket_no, v_subject
    from tickets where id = new.ticket_id;

  select count(*) into v_msg_count from ticket_messages where ticket_id = new.ticket_id;

  if new.sender = 'support' then
    -- Müşteriye cevap geldi
    insert into notifications (user_id, type, title, body, category, link)
    values (v_owner_id, 'ticket_replied',
            'Destek talebinize yanıt geldi',
            v_ticket_no || ' — ' || v_subject,
            'tickets', '/dashboard/support');
  elsif v_msg_count > 1 then
    -- Adminlere yeni müşteri mesajı (ilk mesaj ticket_created ile bildirildiği için atlanır)
    insert into notifications (user_id, type, title, body, category, link)
    select p.id, 'ticket_user_replied',
           'Ticket güncellendi',
           v_ticket_no || ' müşteri tarafından güncellendi: ' || v_subject,
           'tickets', '/admin/tickets'
      from profiles p where p.role = 'admin';
  end if;
  return new;
end $$;

drop trigger if exists trg_ticket_msg_notify on ticket_messages;
create trigger trg_ticket_msg_notify
  after insert on ticket_messages
  for each row execute function public.on_ticket_message_created();
