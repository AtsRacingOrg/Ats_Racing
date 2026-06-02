-- =============================================================================
-- ATS Racing — Sipariş iptal nedeni
-- Admin sipariş iptal ettiğinde nedeni saklayabilmek için orders.cancellation_reason
-- alanı eklenir. Müşteri (kullanıcı/bayi) bu metni siparişlerim ekranında okur.
-- =============================================================================

alter table public.orders
  add column if not exists cancellation_reason text;
