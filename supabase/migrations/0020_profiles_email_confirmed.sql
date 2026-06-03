-- =============================================================================
-- ATS Racing — E-posta doğrulanmadan başvuru admin önüne düşmesin
--
-- profiles.email_confirmed: auth.users.email_confirmed_at ile senkron tutulur.
-- Admin "Bekleyenler" listesi yalnız email_confirmed = true başvuruları gösterir.
-- =============================================================================

alter table public.profiles add column if not exists email_confirmed boolean not null default false;

-- Kayıt anında (signUp) email_confirmed'i auth.users'tan türet (genelde false).
create or replace function public.handle_new_user()
  returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role;
  v_status account_status;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'user')::user_role;
  v_status := case when v_role = 'dealer' then 'pending'::account_status
                   else 'approved'::account_status end;

  insert into public.profiles (id, email, role, full_name, phone, dealership_name, status, approved_at, email_confirmed)
  values (
    new.id,
    new.email,
    v_role,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'dealership_name',
    v_status,
    case when v_status = 'approved' then now() else null end,
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- E-posta doğrulandığında profiles.email_confirmed = true.
create or replace function public.sync_email_confirmed()
  returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null
     and (old.email_confirmed_at is null or old.email_confirmed_at is distinct from new.email_confirmed_at) then
    update public.profiles set email_confirmed = true where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.sync_email_confirmed();

update public.profiles p
   set email_confirmed = (u.email_confirmed_at is not null)
  from auth.users u
 where u.id = p.id;
