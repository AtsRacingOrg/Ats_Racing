-- =============================================================================
-- ATS Racing — Immo Off (EPROM) modülü
-- Mevcut "Immo Off (FLASH)" yanına EPROM varyantı eklenir (Güvenlik kategorisi).
-- =============================================================================

insert into service_catalog (code, label, description, kind, category_id, price) values
  ('immo_eprom', 'Immo Off (EPROM)', 'İmmobilizer EPROM ile kaldırma', 'module',
     (select id from service_categories where name = 'Güvenlik'), 500)
on conflict (code) do nothing;
