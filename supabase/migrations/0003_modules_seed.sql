-- =============================================================================
-- ATS Racing — "Ekstra Modüller" satış kataloğu seed'i
-- tools-page.ts MODULES listesindeki 14 modül → service_catalog (kind='module').
-- Çakışan 4 kavram (egr/vmax/swirl_flaps/start_stop) mevcut kayıtla BİRLEŞTİRİLİR
-- ki xlsx'ten gelen engine_services bağları (28k) bozulmasın.
-- Fiyatlar tools-page'deki ₺ değerleridir. Idempotent (on conflict do update).
-- =============================================================================

-- ── Çakışan 4: mevcut xlsx kayıtlarını satılabilir modüle yükselt (kod korunur) ──
update service_catalog set kind = 'module', price = 250, label = 'EGR'
  where code = 'egr';
update service_catalog set kind = 'module', price = 250, label = 'VMAX'
  where code = 'vmax';
update service_catalog set kind = 'module', price = 180, label = 'Flaps / Swirl'
  where code = 'swirl_flaps';   -- UI key 'flaps'
update service_catalog set kind = 'module', price = 150, label = 'Start-Stop'
  where code = 'start_stop';    -- UI key 'startstop'

-- ── Eksik 10 modül (ekranda var, DB'de yoktu) ────────────────────────────────
insert into service_catalog (code, label, description, kind, category_id, price) values
  ('dpf',       'DPF',                   'Partikül filtre devre dışı',
     'module', (select id from service_categories where name = 'Emisyon'),   350),
  ('adblue',    'Adblue / SCR',          'Üre sistemi devre dışı',
     'module', (select id from service_categories where name = 'Emisyon'),   400),
  ('lambda',    'Lambda',                'O2 sensör iptali',
     'module', (select id from service_categories where name = 'Emisyon'),   200),
  ('nox',       'NOX',                   'NOx sensör devre dışı',
     'module', (select id from service_categories where name = 'Emisyon'),   200),
  ('immo',      'Immo Off (FLASH)',      'İmmobilizer flash ile kaldırma',
     'module', (select id from service_categories where name = 'Güvenlik'),  500),
  ('ready',     'Readiness Calibration', 'OBD hazırlık kalibrasyonu',
     'module', (select id from service_categories where name = 'Motor'),     150),
  ('rpm',       'RPM Soft Limiter',      'Yumuşak devir sınırı kaldırma',
     'module', (select id from service_categories where name = 'Performans'),200),
  ('torque',    'Torque Monitor',        'Tork monitör devre dışı',
     'module', (select id from service_categories where name = 'Performans'),120),
  ('tva',       'TVA',                   'Gaz kelebeği aktüatör iptali',
     'module', (select id from service_categories where name = 'Motor'),     180),
  ('waterpump', 'Water Pump',            'Su pompası PWM kontrolü',
     'module', (select id from service_categories where name = 'Motor'),     120)
on conflict (code) do update set
  label       = excluded.label,
  description = excluded.description,
  kind        = excluded.kind,
  category_id = excluded.category_id,
  price       = excluded.price;
