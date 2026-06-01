-- =============================================================================
-- ATS Racing — payments.order_id FK düzeltmesi
-- 'on delete set null' + (order_id veya statement_id dolu olmalı) check'i çelişiyordu:
-- sipariş silinince peşin ödeme order_id=null olup check'i bozuyordu. Cascade'e çevrilir.
-- =============================================================================

alter table payments drop constraint if exists payments_order_id_fkey;
alter table payments add constraint payments_order_id_fkey
  foreign key (order_id) references orders(id) on delete cascade;
