-- =============================================================================
-- ATS Racing — Normal kullanıcı kayıtlarını otomatik onayla
-- Sadece bayi (dealer) kayıtları admin onayı bekler. Normal user rolü
-- doğrudan 'approved' olur, e-posta doğrulamasından sonra giriş yapabilir.
-- =============================================================================

create or replace function public.handle_new_user()
  returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role;
  v_status account_status;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'user')::user_role;
  v_status := case when v_role = 'dealer' then 'pending'::account_status
                   else 'approved'::account_status end;

  insert into public.profiles (id, email, role, full_name, phone, dealership_name, status, approved_at)
  values (
    new.id,
    new.email,
    v_role,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'dealership_name',
    v_status,
    case when v_status = 'approved' then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Geçmişte 'pending' kalmış normal kullanıcıları da onayla (yalnızca user rolü).
update public.profiles
   set status = 'approved',
       approved_at = coalesce(approved_at, now())
 where role = 'user' and status = 'pending';
