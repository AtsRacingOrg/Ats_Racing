-- =============================================================================
-- ATS Racing — Fonksiyon EXECUTE yetkilerini sıkılaştır (Security Advisor)
--
-- SECURITY DEFINER fonksiyonlar REST RPC (/rest/v1/rpc/<fn>) üzerinden
-- doğrudan çağrılabiliyordu. Trigger fonksiyonları hiç çağrılmamalı; iş
-- RPC'leri yalnız giriş yapmış kullanıcıya açık olmalı.
--
-- Not: Trigger fonksiyonlarından EXECUTE kaldırmak trigger'ları ETKİLEMEZ —
-- trigger'lar yetkiden bağımsız çalışır.
-- =============================================================================

-- Trigger fonksiyonları: yalnız trigger olarak çalışır, RPC ile çağrılmamalı.
revoke execute on function public.bump_ticket_updated() from public, anon, authenticated;
revoke execute on function public.on_order_created() from public, anon, authenticated;
revoke execute on function public.on_order_status_changed() from public, anon, authenticated;
revoke execute on function public.on_ticket_created() from public, anon, authenticated;
revoke execute on function public.on_ticket_message_created() from public, anon, authenticated;
revoke execute on function public.update_statement_total() from public, anon, authenticated;

-- İş RPC'leri: yalnız giriş yapmış kullanıcılar (uygulama JWT'siyle çağırır).
revoke execute on function public.create_order(jsonb) from public, anon;
revoke execute on function public.create_ticket(jsonb) from public, anon;
revoke execute on function public.reply_ticket(uuid, text) from public, anon;
grant execute on function public.create_order(jsonb) to authenticated;
grant execute on function public.create_ticket(jsonb) to authenticated;
grant execute on function public.reply_ticket(uuid, text) to authenticated;

-- is_admin(): RLS politikaları için authenticated'a gerekli; anon'a değil.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
