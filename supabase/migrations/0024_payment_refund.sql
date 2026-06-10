-- =============================================================================
-- ATS Racing — Ödeme iadesi (normal müşteri / kart)
--
--  • Normal müşteride ödeme sipariş anında peşin alınır (PayTR — entegrasyon yolda).
--  • Admin siparişi iptal edince ilgili ödeme iade edilir: status='refunded'.
--  • İade denetimi için refunded_at + refund_ref (PayTR iade referansı) eklenir.
-- =============================================================================

alter table public.payments
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_ref  text;
