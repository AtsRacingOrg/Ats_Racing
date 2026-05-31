-- =============================================================================
-- ATS Racing — Değiştirilmiş Parçalar referans tablosu
-- Araçlar ekranı (Chip Tuning) Adım 4'teki statik liste DB'ye taşınır.
-- Idempotent: tekrar çalıştırılabilir.
-- =============================================================================

create table if not exists modified_parts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort_order  int  not null default 0,
  is_active   boolean not null default true
);

-- RLS: herkese okunur; yazma yalnızca admin (katalog ile aynı kalıp)
alter table modified_parts enable row level security;

drop policy if exists modified_parts_read on modified_parts;
create policy modified_parts_read on modified_parts for select using (true);

drop policy if exists modified_parts_admin_write on modified_parts;
create policy modified_parts_admin_write on modified_parts for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Seed: tools-page'deki 16 statik parça (sıra korunur)
insert into modified_parts (name, sort_order) values
  ('Soğuk Hava Giriş Kiti', 1),
  ('Ara Soğutucu (Intercooler)', 2),
  ('Egzoz Borusu (Katalizörsüz)', 3),
  ('Emme Manifoldu', 4),
  ('Egzoz Sistemi (Turbo Çıkışı)', 5),
  ('Egzoz Sistemi (Katalizör Sonrası)', 6),
  ('Geliştirilmiş Enjektörler', 7),
  ('Geliştirilmiş Harita Sensörü', 8),
  ('Atık Gaz Valfi (BOV)', 9),
  ('Boşaltma Vanası', 10),
  ('Şarj Hava Borusu Kiti', 11),
  ('Hibrit Turbo', 12),
  ('Yükseltilmiş (Büyük) Turbo', 13),
  ('Yarı Gaz Sistemi', 14),
  ('Yüksek Akışlı Yakıt Pompası', 15),
  ('Spor Hava Filtresi', 16)
on conflict (name) do nothing;
