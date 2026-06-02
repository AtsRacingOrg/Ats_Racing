-- =============================================================================
-- ATS Racing — Rate limiting (sabit pencere sayaç + sert eşikte geçici blok)
--
-- Vercel serverless'ta instance'lar arası tutarlı limit için paylaşılan tablo.
-- API (service-role) `rl_hit(key, limit, window, hard, block)` çağırır:
--   * count <= limit  → izin
--   * count > limit   → 429 (geçici)
--   * count > hard    → blocked_until ayarlanır → süre boyunca 403
-- Yalnız service-role çağırabilir (anon/authenticated EXECUTE yok).
-- =============================================================================

create table if not exists rate_limits (
  key           text primary key,
  count         int not null default 0,
  window_start  timestamptz not null default now(),
  blocked_until timestamptz
);

create or replace function rl_hit(p_key text, p_limit int, p_window int, p_hard int, p_block int)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_now timestamptz := now();
  v_count int; v_start timestamptz; v_blocked timestamptz;
begin
  insert into rate_limits(key, count, window_start)
  values (p_key, 1, v_now)
  on conflict (key) do update set
    count = case
      when rate_limits.blocked_until is not null and rate_limits.blocked_until > v_now
        then rate_limits.count
      when rate_limits.window_start < v_now - make_interval(secs => p_window)
        then 1
      else rate_limits.count + 1 end,
    window_start = case
      when (rate_limits.blocked_until is null or rate_limits.blocked_until <= v_now)
           and rate_limits.window_start < v_now - make_interval(secs => p_window)
        then v_now
      else rate_limits.window_start end
  returning count, window_start, blocked_until into v_count, v_start, v_blocked;

  if (v_blocked is null or v_blocked <= v_now) and v_count > p_hard then
    update rate_limits set blocked_until = v_now + make_interval(secs => p_block)
      where key = p_key returning blocked_until into v_blocked;
  end if;

  return jsonb_build_object(
    'blocked', (v_blocked is not null and v_blocked > v_now),
    'allowed', (v_count <= p_limit) and (v_blocked is null or v_blocked <= v_now),
    'count', v_count,
    'retryAt', coalesce(v_blocked, v_start + make_interval(secs => p_window))
  );
end $$;

revoke execute on function rl_hit(text,int,int,int,int) from public, anon, authenticated;
