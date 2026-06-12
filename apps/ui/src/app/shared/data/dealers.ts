/** Bayilerimiz dizini. `region` harita bölge adıyla bire bir eşleşmeli:
 *  TR → il adı (turkey-map.ts), DE → eyalet (germany-map.ts, İngilizce). */
export type DealerCountry = 'TR' | 'DE';

export interface Dealer {
  readonly name: string;
  readonly city: string;     // gösterilen il/şehir
  readonly region: string;   // harita anahtarı (il / eyalet)
  readonly address: string;  // açık adres
  readonly phone: string;
  readonly contact: string;  // e-posta
  readonly country: DealerCountry;
}

export const DEALERS: Dealer[] = [
  // ── Türkiye ──
  { name: 'ATS Racing Merkez', city: 'İstanbul', region: 'Istanbul', address: 'İkitelli OSB, Başakşehir, İstanbul', phone: '+90 212 000 00 00', contact: 'istanbul@atsracing.com', country: 'TR' },
  { name: 'STRD Performance',  city: 'Ankara',   region: 'Ankara',   address: 'İvedik OSB, Yenimahalle, Ankara',     phone: '+90 312 000 00 00', contact: 'ankara@atsracing.com',  country: 'TR' },
  { name: 'Ege Tuning',        city: 'İzmir',    region: 'İzmir',    address: 'Çiğli Atatürk OSB, İzmir',            phone: '+90 232 000 00 00', contact: 'izmir@atsracing.com',   country: 'TR' },
  { name: 'Bursa Motorsport',  city: 'Bursa',    region: 'Bursa',    address: 'Nilüfer OSB, Bursa',                  phone: '+90 224 000 00 00', contact: 'bursa@atsracing.com',   country: 'TR' },
  { name: 'Akdeniz Performans',city: 'Antalya',  region: 'Antalya',  address: 'Kepez Sanayi Sitesi, Antalya',        phone: '+90 242 000 00 00', contact: 'antalya@atsracing.com', country: 'TR' },
  { name: 'Çukurova Tuning',   city: 'Adana',    region: 'Adana',    address: 'Seyhan Sanayi, Adana',                phone: '+90 322 000 00 00', contact: 'adana@atsracing.com',   country: 'TR' },

  // ── Almanya ──
  { name: 'ATS Racing Deutschland', city: 'München',   region: 'Bavaria',                address: 'Landsberger Str. 100, 80339 München',   phone: '+49 89 0000000',  contact: 'muenchen@atsracing.com',  country: 'DE' },
  { name: 'Berlin Performance',     city: 'Berlin',    region: 'Berlin',                 address: 'Storkower Str. 140, 10407 Berlin',      phone: '+49 30 0000000',  contact: 'berlin@atsracing.com',    country: 'DE' },
  { name: 'RheinTuning',            city: 'Köln',      region: 'North Rhine-Westphalia', address: 'Industriestr. 25, 50996 Köln',          phone: '+49 221 0000000', contact: 'koeln@atsracing.com',     country: 'DE' },
  { name: 'Frankfurt Motorsport',   city: 'Frankfurt', region: 'Hesse',                  address: 'Hanauer Landstr. 200, 60314 Frankfurt', phone: '+49 69 0000000',  contact: 'frankfurt@atsracing.com', country: 'DE' },
];

/** Google Maps konum bağlantısı (adres + şehir). */
export function mapsUrl(d: Dealer): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${d.name} ${d.address} ${d.city}`)}`;
}
