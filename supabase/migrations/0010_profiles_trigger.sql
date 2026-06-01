-- =============================================================================
-- ATS Racing — auth.users → profiles otomatik kopyalama trigger'ı
-- Yeni kullanıcı signUp olduğunda raw_user_meta_data'dan profil oluşturulur.
-- Bu trigger olmadan yeni kayıtlar 500 hatası alır (profil bulunamadı).
-- =============================================================================

create or replace function public.handle_new_user()
  returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role, full_name, phone, dealership_name, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'user')::user_role,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'dealership_name',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
