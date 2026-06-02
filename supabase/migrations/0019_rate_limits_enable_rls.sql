-- =============================================================================
-- ATS Racing — rate_limits tablosuna RLS (Security Advisor: rls_disabled_in_public)
--
-- Tablo yalnız service-role (rl_hit RPC) tarafından kullanılır. RLS'i policy'siz
-- açmak anon/authenticated erişimini tamamen kapatır; service-role bypass eder.
-- =============================================================================

alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;
