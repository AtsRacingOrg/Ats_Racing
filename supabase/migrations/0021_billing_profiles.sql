-- =============================================================================
-- ATS Racing — Fatura bilgileri (bireysel / kurumsal) + sipariş zorunluluğu
-- =============================================================================

create table if not exists billing_profiles (
  user_id      uuid primary key references profiles(id) on delete cascade,
  type         text not null default 'individual' check (type in ('individual','corporate')),
  full_name    text,
  tc_no        text,
  company_name text,
  tax_office   text,
  tax_number   text,
  phone        text,
  address      text,
  city         text,
  district     text,
  updated_at   timestamptz not null default now()
);

alter table billing_profiles enable row level security;

drop policy if exists billing_select on billing_profiles;
create policy billing_select on billing_profiles for select using (user_id = auth.uid() or is_admin());
drop policy if exists billing_insert on billing_profiles;
create policy billing_insert on billing_profiles for insert with check (user_id = auth.uid());
drop policy if exists billing_update on billing_profiles;
create policy billing_update on billing_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Fatura bilgisi tam mı?
create or replace function has_complete_billing(p_uid uuid)
  returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from billing_profiles b where b.user_id = p_uid and (
      (b.type = 'individual'
        and coalesce(b.full_name,'') <> '' and coalesce(b.tc_no,'') <> ''
        and coalesce(b.address,'') <> '' and coalesce(b.city,'') <> '')
      or
      (b.type = 'corporate'
        and coalesce(b.company_name,'') <> '' and coalesce(b.tax_office,'') <> ''
        and coalesce(b.tax_number,'') <> '' and coalesce(b.address,'') <> '' and coalesce(b.city,'') <> '')
    )
  );
$$;
revoke execute on function has_complete_billing(uuid) from anon;
