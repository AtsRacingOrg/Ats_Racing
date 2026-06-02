-- =============================================================================
-- ATS Racing — İptal edilen siparişler bayi ekstre toplamına girmesin
-- Ekstre toplamı yalnızca iptal edilmemiş (status <> 'cancelled') siparişlerin
-- total_price toplamıdır. Ayrıca trigger artık status değişiminde de tetiklenir,
-- böylece bir sipariş iptal edildiğinde bayinin bakiyesinden düşülür.
-- =============================================================================

create or replace function update_statement_total() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and old.statement_id is distinct from new.statement_id
     and old.statement_id is not null then
    update dealer_statements s
      set total = coalesce((
        select sum(total_price) from orders
        where statement_id = old.statement_id and status <> 'cancelled'
      ), 0)
      where s.id = old.statement_id;
  end if;
  if new.statement_id is not null then
    update dealer_statements s
      set total = coalesce((
        select sum(total_price) from orders
        where statement_id = new.statement_id and status <> 'cancelled'
      ), 0)
      where s.id = new.statement_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_order_statement_total on orders;
create trigger trg_order_statement_total
  after insert or update of statement_id, total_price, status on orders
  for each row execute function update_statement_total();

-- Mevcut ekstre toplamlarını yeni kurala göre (iptaller hariç) yeniden hesapla.
update dealer_statements s
  set total = coalesce((
    select sum(total_price) from orders
    where statement_id = s.id and status <> 'cancelled'
  ), 0);
