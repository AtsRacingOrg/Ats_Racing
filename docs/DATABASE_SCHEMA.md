# ATS Racing — Veritabanı Kurgusu

> Hedef: Dashboard'daki **Genel Bakış**'tan **Destek**'e kadar tüm ekranlardaki veriyi
> (şu an mock olan her şey dahil) dinamik hale getirecek ilişkisel şema.
> Platform: **PostgreSQL / Supabase** (Auth + Postgres + Storage + RLS).
> Mevcut durum: yalnızca `auth.users` + `public.profiles` (kayıt/onay akışı) canlı.
> Bu doküman geri kalan tabloları, ilişkileri, enum'ları, indeks/RLS notlarını ve
> hangi ekranın hangi tabloyu tükettiğini tanımlar.

---

## 1. Genel Mimari

```
auth.users (Supabase)
   └─ profiles (1-1)  ── kullanıcı / bayi / admin
        ├─ orders (1-N)               siparişler
        │    ├─ order_items (1-N)     ek servis / modül satırları
        │    ├─ order_pcodes (1-N)    pcode + not girişleri
        │    ├─ order_events (1-N)    durum geçmişi (timeline)
        │    └─ tuning_files (1-N)    orijinal + teslim dosyaları
        ├─ tickets (1-N)              destek talepleri
        │    └─ ticket_messages (1-N) mesajlaşma
        ├─ dealer_statements (1-N)    bayi aylık ekstreleri
        │    └─ orders.statement_id   ekstreye bağlı siparişler
        └─ payments (1-N)             ödemeler (peşin / ekstre)

Katalog (siparişten bağımsız referans veri):
   brands → models → series → engines        araç/motor ağacı + güç değerleri
   service_catalog (+ service_categories)     modüller & ek servisler + fiyat
   tuning_prices                              stage taban fiyatları
```

Tasarım ilkeleri:

- **Snapshot + referans birlikte.** Sipariş satırlarında hem `*_id` (katalog referansı)
  hem de o anki etiket/fiyat **kopyası** tutulur. Katalog fiyatı sonra değişse bile
  geçmiş siparişin tutarı bozulmaz.
- **Özet ekranlar türetilir.** Genel Bakış / Admin Genel Bakış kartları ve grafikleri
  ayrı tabloda saklanmaz; aggregate sorgular ya da `VIEW`'lardan gelir (bkz. §10).
- **Para birimi `numeric(12,2)` + minor unit yok.** Tüm tutarlar TRY. UI'daki `₺2.500`
  gibi string'ler kaldırılır, sayı olarak tutulur, formatlama frontend'de yapılır.
- **Zaman damgaları `timestamptz`**, `now()` default.
- **Roller server-side**: `profiles.role` yalnızca trigger/admin tarafından yazılır
  (mevcut güvenlik kuralı korunur — istemci kendini admin yapamaz).

---

## 2. Enum'lar

```sql
create type user_role        as enum ('user', 'dealer', 'admin');
create type account_status   as enum ('pending', 'approved', 'rejected');

-- Kaynak listedeki (atmchiptuning) 10 yakıt değeri birebir korunur.
create type fuel_type        as enum (
  'petrol', 'diesel',
  'petrol_mhev', 'petrol_phev', 'petrol_hybrid',
  'diesel_mhev', 'diesel_phev', 'diesel_hybrid',
  'ev', 'lpg'
);  -- Benzine, Diesel, Benzine MHEV, Benzine PHEV, Benzine Hybride,
    -- Diesel MHEV, Diesel PHEV, Diesel Hybride, EV, LPG
create type read_method      as enum ('obd', 'bench', 'bootloader');
-- Kaynak liste yalnızca Stage 1 + Stage 1+ içerir (Stage 2/3 yok).
create type tuning_stage      as enum ('stage1', 'stage1_plus');
create type service_kind      as enum ('module', 'extra');              -- Modül vs ek servis

create type order_status      as enum ('pending', 'processing', 'completed', 'cancelled');
create type file_kind         as enum ('original', 'delivered');         -- müşteri yüklemesi / teslim
create type file_status       as enum ('review', 'preparing', 'delivered'); -- İncelemede/Hazırlanıyor/Teslim

create type statement_status  as enum ('accruing', 'due', 'overdue', 'paid');
create type payment_method    as enum ('card', 'transfer', 'dealer_credit');
create type payment_status    as enum ('pending', 'succeeded', 'failed', 'refunded');

create type ticket_status     as enum ('open', 'pending', 'resolved');
create type ticket_sender     as enum ('user', 'support');
```

> Not: UI'da Türkçe gösterilen durumlar (`Teslim Edildi`, `Beklemede` vb.) DB'de
> İngilizce enum olarak tutulur; etiketleme frontend `Record<enum, string>` ile yapılır
> (zaten orders-page / files-page bu kalıbı kullanıyor).

---

## 3. profiles (mevcut — kayıt & onay)

`auth.users` ile 1-1. Şu an canlı olan tek tablo; sadece birkaç alan eklenmesi öneriliyor.

| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK | `references auth.users(id) on delete cascade` |
| `email` | text not null unique | |
| `role` | user_role not null default 'user' | trigger/admin yazar |
| `full_name` | text not null | |
| `phone` | text null | |
| `dealership_name` | text null | bayi ise zorunlu (app-level) |
| `status` | account_status not null default 'pending' | çift kapı: e-posta + admin onayı |
| `rejection_reason` | text null | |
| `approved_by` | uuid null → profiles(id) | onaylayan admin |
| `approved_at` | timestamptz null | |
| **`last_login_at`** | timestamptz null | *yeni* — Admin Users "Son Giriş" |
| **`is_active`** | boolean not null default true | *yeni* — Admin Users active/passive |
| `created_at` | timestamptz default now() | "Katılım" |
| `updated_at` | timestamptz default now() | trigger ile güncellenir |

**Türetilen alanlar (saklanmaz):** `avatar` (baş harfler), `orders` sayısı,
`paymentTotal` → sorgu/`VIEW`.

**Tüketen ekranlar:** Login/Auth, Dashboard layout (isim/rol → menü), Admin Users,
Admin Registrations, Destek (mesaj göndereni).

**RLS:**
- `profiles_select_own`: `auth.uid() = id`
- `profiles_admin_all`: `role = 'admin'` (admin tüm profilleri görür/günceller)
- Insert yalnızca signup trigger'ı (`handle_new_user`) üzerinden.

---

## 4. Araç & Motor Kataloğu (Araçlar ekranı — Chip Tuning sekmesi)

tools-page'deki sabit `CATALOG` ağacı normalize edilir. Sıralı: marka → model → seri → motor.

### 4.1 brands
| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK default gen_random_uuid() | |
| `name` | text not null unique | "BMW", "Audi" |
| `slug` | text not null unique | |
| `logo_url` | text null | |
| `sort_order` | int default 0 | |
| `is_active` | boolean default true | |

### 4.2 models
| `id` uuid PK · `brand_id` uuid not null → brands(id) on delete cascade · `name` text not null ("M3") · `sort_order` int · unique(`brand_id`,`name`) |

### 4.3 series
| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK | |
| `model_id` | uuid not null → models(id) cascade | |
| `name` | text not null | "F80", "G80" |
| `year_label` | text | "2014–2018" (UI gösterimi) |
| `year_from` | int null | filtre/sıralama için |
| `year_to` | int null | null = devam ediyor |
| unique(`model_id`,`name`) | | |

### 4.4 engines
Güç tablosunun kalbi — stock + Stage 1 + Stage 1+ HP & tork değerleri burada.
Kolonlar kaynak `atmchiptuning` listesine (§4.5) göre düzenlenmiştir.

| Kolon | Tip | Kaynak (xlsx) / Not |
|---|---|---|
| `id` | uuid PK | |
| `series_id` | uuid not null → series(id) cascade | |
| `label` | text not null | E: Motor — "1.4 MultiAir Turbo 140pk" |
| `engine_no` | text null | H: Motor Numarası — "55253268" (ECU **değil**) |
| `ecu` | text null | **veride yok** — null gelir, sonradan doldurulur |
| `displacement` | text null | (türetilebilir) "1.4L Turbo" |
| `displacement_cc` | int null | I: "1368 CC" → 1368 (birim sıyrılır) |
| `bore` | text null | J: Boring X Slag — "72,0 X 84,0 mm" |
| `compression_ratio` | text null | K: "9,8 : 1" |
| `fuel` | fuel_type not null | F: Yakıt Tipi (map → enum) |
| `tuning_method` | text null | G: Yazılım Yöntemi — "Chiptuning" / "Externe module" |
| `year_label` | text | D: Nesil — "2016 ->" |
| `notes` | text null | P: Ek Bilgiler (NL — gerekirse çevrilir) |
| `source_path` | text null unique | A: Klasör Yolu — import idempotency anahtarı |
| `stock_hp` | int | L |
| `stock_torque` | int | M |
| `stage1_hp` | int | Q |
| `stage1_torque` | int | R |
| `stage1plus_hp` | int null | U |
| `stage1plus_torque` | int null | V |
| `is_active` | boolean default true | |

> HP/tork **kazanım** kolonları (S,T,W,X) saklanmaz — `stageX_hp − stock_hp` ile türetilir
> (Dosya Detayı'ndaki "+129 HP" rozetinde zaten bu kalıp kullanılıyor).
> Engine, hem Araçlar ekranındaki "yazılım seviyesi/sonuç" tablosunu, hem Dosya Detayı'ndaki
> **Motor Özellikleri** + **Güç Kazanımı** bloklarını besler.

**RLS:** Katalog herkese **okunur** (`select` public/authenticated). Yazma yalnızca admin.

### 4.5 Kaynak xlsx → tablo eşlemesi (atmchiptuning, 8.170 satır / 67 marka)

| xlsx kolonu | Hedef | Dönüşüm |
|---|---|---|
| A Klasör Yolu | engines.source_path | aynen (idempotency) |
| B Marka | brands.name | distinct → brands |
| C Model | models.name | (brand, model) distinct |
| D Nesil | series.name + year_label | "2016 ->" → year_from=2016, year_to=null |
| E Motor | engines.label | |
| F Yakıt Tipi | engines.fuel | Benzine→petrol, Diesel→diesel, *MHEV/PHEV/Hybride/EV/LPG → ilgili enum |
| G Yazılım Yöntemi | engines.tuning_method | |
| H Motor Numarası | engines.engine_no | |
| I Silindir Hacmi | engines.displacement_cc | " CC" sıyrılır, sayıya çevrilir |
| J Boring X Slag | engines.bore | virgül→nokta normalize (opsiyonel) |
| K Sıkıştırma | engines.compression_ratio | |
| L / M | stock_hp / stock_torque | |
| N Toplam Stage | — | yok sayılır (hep "2") |
| O Ek Seçenekler | engine_services (§5.4) | virgülle ayır → service_catalog eşle |
| P Ek Bilgiler | engines.notes | NL metin |
| Q,R / U,V | stage1_*, stage1plus_* | |
| S,T,W,X | — | türetilir (kazanım) |

> Avrupa formatı uyarısı: ondalıklarda **virgül** (`9,8`), bazı hücrelerde birim metni
> gömülü (`1368 CC`, `72,0 X 84,0 mm`). Import scripti bunları temizler.
> Boşluk oranı: engine_no ~%92, cc ~%99, bore ~%98, sıkıştırma ~%97, Ek Seçenekler ~%70,
> Ek Bilgiler ~%8 dolu.

---

## 5. Servis Kataloğu (Araçlar — Modüller sekmesi + sipariş ek servisleri)

tools-page `MODULES` ve orders-page `EXTRA_SERVICES` listeleri tek tabloda birleşir.

### 5.1 service_categories
`id` uuid PK · `name` text unique ("Emisyon","Motor","Performans","Konfor","Güvenlik","Egzoz") · `sort_order` int

### 5.2 service_catalog
| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK | |
| `code` | text not null unique | "dpf", "egr", "vmax"… |
| `label` | text not null | "DPF", "VMAX" |
| `description` | text | "Partikül filtre devre dışı" |
| `kind` | service_kind not null | module / extra |
| `category_id` | uuid → service_categories(id) | |
| `price` | numeric(12,2) not null | güncel taban fiyat |
| `is_active` | boolean default true | |

### 5.3 tuning_prices
Stage taban fiyatları (tools-page `TUNING_PRICES`). Artık iki kayıt: `stage1`, `stage1_plus`.
`stage` tuning_stage PK · `price` numeric(12,2) not null · `updated_at` timestamptz

### 5.4 engine_services  (araç ↔ sunulabilen ek servis — "Ek Seçenekler")
Kaynak listenin O kolonu virgülle ayrılıp `service_catalog` ile eşlenir. Hangi motorda
hangi ek servis sunulabildiğini belirtir (Araçlar ekranında seçilebilir modüller).

| `engine_id` uuid → engines(id) cascade · `service_id` uuid → service_catalog(id) · PK(`engine_id`,`service_id`) |

> Eşlenemeyen serbest metin opsiyonlar (NL adlar) için import scripti bir
> `code`↔alias sözlüğü kullanır; bilinmeyenler log'lanıp atlanır.

**Tüketen:** Araçlar (her iki sekme), sipariş fiyat hesabı, sipariş/dosya detayındaki ek servis listeleri.

---

## 6. Siparişler (Siparişlerim + Admin Siparişler)

### 6.1 orders
Hem snapshot (geçmiş bozulmasın) hem referans tutar.

| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK | |
| `order_no` | text not null unique | "ORD-048" — sequence/trigger ile üretilir |
| `user_id` | uuid not null → profiles(id) | sipariş sahibi |
| `engine_id` | uuid null → engines(id) | referans (silinirse null) |
| `make` `model` | text | snapshot (UI'da "BMW M3 G80") |
| `year` | int | |
| `engine_label` | text | "3.0L S58 510HP" snapshot |
| `fuel` | fuel_type | |
| `transmission` | text | "Manuel"/"Otomatik"/"DSG" |
| `vin` | text null | şasi no |
| `km` | text null | |
| `stage` | tuning_stage not null | |
| `ecu` | text | |
| `read_method` | read_method not null | |
| `base_price` | numeric(12,2) not null | stage taban fiyat snapshot |
| `extras_total` | numeric(12,2) not null default 0 | order_items toplamı |
| `total_price` | numeric(12,2) not null | base + extras |
| `status` | order_status not null default 'pending' | |
| `notes` | text null | müşteri notu |
| `statement_id` | uuid null → dealer_statements(id) | bayi ise bağlı ekstre |
| `created_at` | timestamptz default now() | |
| `updated_at` | timestamptz default now() | |

İndeks: `(user_id, created_at desc)`, `(status)`, `(statement_id)`.

### 6.2 order_items  (ek servis / modül satırları)
| `id` uuid PK · `order_id` uuid not null → orders(id) cascade · `service_id` uuid → service_catalog(id) · `label` text (snapshot) · `unit_price` numeric(12,2) (snapshot) |

### 6.3 order_pcodes  (Araçlar — pcode + not girişleri)
> Kullanıcı isteği: pcode + not **tek bir ekleme birimi**; eklenip silinebilir.

| `id` uuid PK · `order_id` uuid not null → orders(id) cascade · `pcode` text not null · `note` text · `created_at` timestamptz |

### 6.4 order_events  (timeline / durum geçmişi)
Admin orders timeline ("Sipariş oluşturuldu", "Dosya gönderildi") + sipariş progress stepper.

| `id` uuid PK · `order_id` uuid not null → orders(id) cascade · `event` text not null · `actor_role` user_role null · `actor_id` uuid null → profiles(id) · `created_at` timestamptz default now() |

**RLS (orders & alt tablolar):**
- Sahip: `user_id = auth.uid()` → select/insert (yeni sipariş).
- Status/dosya güncellemesi: yalnızca admin.
- Admin: hepsi.

**Tüketen:** Siparişlerim (liste + detay + progress), Admin Siparişler (timeline, müşteri bilgisi `join profiles`), Genel Bakış (sayımlar), Destek (ticket → sipariş seçimi), Ödeme Borçlarım (ekstre kalemleri).

---

## 7. Dosyalar (Dosyalarım + Dosya Detayı + sipariş dosya kartı)

`tuning_files` hem müşterinin yüklediği **orijinal** dosyayı hem ekibin ürettiği **teslim**
dosyasını tutar. Supabase Storage'da fiziksel dosya, DB'de meta + yol.

| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK | |
| `order_id` | uuid not null → orders(id) cascade | |
| `user_id` | uuid not null → profiles(id) | hızlı sahiplik/RLS |
| `kind` | file_kind not null | original / delivered |
| `file_name` | text not null | "bmw_m3_f80_stage2.bin" |
| `storage_path` | text not null | Storage bucket yolu |
| `type` | text | "Stage 2", "DPF+EGR Off" |
| `status` | file_status not null default 'review' | İncelemede/Hazırlanıyor/Teslim |
| `is_downloadable` | boolean default false | müşteri indirebilir mi |
| `amount` | numeric(12,2) null | dosyaya yansıyan tutar (genelde order.total) |
| `delivery_date` | timestamptz null | |
| `notes` | text null | teknik notlar |
| `created_at` | timestamptz default now() | |

> Dosya Detayı'ndaki **Motor Özellikleri / Güç Kazanımı** alanları `orders.engine_id → engines`
> üzerinden join ile gelir (dosyada tekrar tutmaya gerek yok). **Sipariş Takibi** timeline'ı
> `order_events`'ten beslenir.

İndeks: `(user_id)`, `(order_id)`, `(status)`.

**RLS:** Sahip yalnızca kendi dosyalarını görür; teslim dosyasını yalnızca
`is_downloadable = true` ise indirebilir. Storage bucket politikası da `user_id` ile eşlenir.

**Tüketen:** Dosyalarım (liste + özet sayaçlar), Dosya Detayı, Sipariş Detayı dosya kartı, Genel Bakış "Son Dosyalar".

---

## 8. Ödemeler & Bayi Ekstreleri (Ödeme Borçlarım + peşin ödeme)

İki ödeme modeli (mevcut iş kuralı):
- **Kullanıcı**: sipariş anında peşin → `payments` satırı (`method='card'`).
- **Bayi**: aylık borç birikir → `dealer_statements` her ayın 1'inde ödenir.

### 8.1 dealer_statements
| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK | |
| `statement_no` | text unique | "EXT-2026-05" |
| `dealer_id` | uuid not null → profiles(id) | |
| `period_year` | int not null · `period_month` int not null | (2026, 5) |
| `due_date` | date not null | bir sonraki ayın 1'i |
| `status` | statement_status not null default 'accruing' | |
| `total` | numeric(12,2) not null default 0 | bağlı orders toplamı (trigger) |
| `paid_at` | timestamptz null | |
| `created_at` | timestamptz default now() | |
| unique(`dealer_id`,`period_year`,`period_month`) | | |

Bağlı siparişler `orders.statement_id` ile. `total` ve `status`, sipariş eklenince/ay
kapanınca trigger ile güncellenir (accruing → due → paid/overdue).

### 8.2 payments
Hem peşin kullanıcı ödemesi hem ekstre ödemesi.
| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid not null → profiles(id) | |
| `order_id` | uuid null → orders(id) | peşin ödemede dolu |
| `statement_id` | uuid null → dealer_statements(id) | bayi ödemesinde dolu |
| `amount` | numeric(12,2) not null | |
| `method` | payment_method not null | |
| `status` | payment_status not null default 'pending' | |
| `provider_ref` | text null | ödeme sağlayıcı referansı |
| `paid_at` | timestamptz null | |
| `created_at` | timestamptz default now() | |

> Constraint: `order_id` veya `statement_id`'den **en az biri** dolu olmalı (`check`).

**RLS:** Bayi/kullanıcı yalnızca kendi `dealer_statements`/`payments` kayıtlarını görür; admin hepsi. Ödeme **oluşturma/onaylama** server-side (güvenlik kuralı: istemci doğrudan finansal işlem yapmaz).

**Tüketen:** Ödeme Borçlarım (özet kartlar = `accruing`/`due`/`outstanding` aggregate, ekstre listesi + kalemleri), Admin Users `paymentTotal`.

---

## 9. Destek (Destek ekranı + Admin Tickets)

### 9.1 tickets
| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK | |
| `ticket_no` | text unique | "TKT-001" |
| `user_id` | uuid not null → profiles(id) | açan kişi |
| `order_id` | uuid null → orders(id) | ilişkili sipariş (Destek'te seçiliyor) |
| `subject` | text not null | |
| `status` | ticket_status not null default 'open' | |
| `created_at` | timestamptz default now() | |
| `updated_at` | timestamptz default now() | son mesajla güncellenir |

### 9.2 ticket_messages
| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid PK | |
| `ticket_id` | uuid not null → tickets(id) cascade | |
| `sender` | ticket_sender not null | user / support |
| `sender_id` | uuid null → profiles(id) | gönderen profil |
| `body` | text not null | |
| `created_at` | timestamptz default now() | |

İndeks: `tickets(user_id, updated_at desc)`, `ticket_messages(ticket_id, created_at)`.

**RLS:** Sahip kendi ticket'larını + mesajlarını görür/yazar; admin/destek hepsini görür ve `support` mesajı yazar.

**Tüketen:** Destek (liste, konuşma, yeni ticket modalı `order_id` seçimi), Admin Tickets.

---

## 10. Türetilen Görünümler (Özet / Grafik ekranları)

Genel Bakış ve Admin Genel Bakış'taki sayılar/grafikler tablo değil **`VIEW`/sorgu**:

| Ekran öğesi | Kaynak |
|---|---|
| Genel Bakış "Toplam Dosya / Harcama / Tamamlanan / Bekleyen" | `orders` + `tuning_files` aggregate (kullanıcı bazlı) |
| Genel Bakış "Aylık Harcama" bar grafiği | `payments` / `orders` `date_trunc('month')` gruplaması |
| Genel Bakış "Son Dosyalar" | `tuning_files order by created_at desc limit 3` |
| Admin "Aylık Kazanç / Sipariş" çizgileri | tüm `orders`/`payments` aylık aggregate |
| Admin "aktif kullanıcı/bayi" sayıları | `profiles` group by role/status |

Öneri: `v_user_dashboard_stats`, `v_monthly_spend`, `v_admin_revenue` adında
`security invoker` view'ları + ağır panolar için opsiyonel materialized view.

---

## 11. Tablo → Ekran Eşlemesi (özet)

| Tablo | Genel Bakış | Siparişlerim | Dosyalarım | Araçlar | Ödeme Borçlarım | Destek | Admin |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| profiles | ✓ | | | | ✓ | ✓ | ✓ |
| brands/models/series/engines | | ✓(snapshot) | ✓ | ✓ | | | ✓ |
| service_catalog / categories | | ✓ | | ✓ | | | ✓ |
| tuning_prices | | ✓ | | ✓ | | | |
| orders | ✓ | ✓ | | ✓(oluştur) | ✓ | ✓ | ✓ |
| order_items | | ✓ | | ✓ | | | ✓ |
| order_pcodes | | | | ✓ | | | ✓ |
| order_events | | ✓ | ✓ | | | | ✓ |
| tuning_files | ✓ | ✓ | ✓ | | | | ✓ |
| dealer_statements | | | | | ✓ | | ✓ |
| payments | ✓ | | | ✓(peşin) | ✓ | | ✓ |
| tickets / ticket_messages | | | | | | ✓ | ✓ |

---

## 12. Uygulama Sırası (öneri)

1. Enum'lar (§2).
2. Katalog: `brands → models → series → engines`, `service_categories → service_catalog`, `tuning_prices` + seed (mevcut mock veriden tohumlama).
3. `profiles`'a `last_login_at`, `is_active` ekle.
4. `orders` + `order_items` + `order_pcodes` + `order_events` (+ `order_no` sequence/trigger).
5. `tuning_files` + Storage bucket (`tuning-files`) + bucket RLS.
6. `dealer_statements` + `payments` + total/status trigger'ları.
7. `tickets` + `ticket_messages`.
8. View'lar (§10).
9. RLS politikaları (her tablo için yukarıdaki notlara göre).
10. Frontend servisleri: mock dizileri tek tek bu tabloları çağıran servislerle değiştir.

> Güvenlik hatırlatması: `role` ve `status` istemciden yazılamaz; finansal işlemler
> (ödeme oluşturma/onay) yalnızca server-side. `SUPABASE_SERVICE_ROLE_KEY` gizli kalır.
