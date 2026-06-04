import { Injectable, effect, signal } from '@angular/core';
import { DICT } from './translations';

export type Lang = 'tr' | 'en';

const STORAGE_KEY = 'ats.lang';

/**
 * Hafif, signal tabanlı çoklu dil servisi.
 * - Seçilen dil localStorage'a yazılır (cache) → giriş yapınca / sayfa yenileyince korunur.
 * - `lang` bir signal olduğu için `| t` pipe'ı (impure) dil değişince anında günceller.
 * - Araç terimleri / modül adları gibi DB'den gelen sabit değerler ÇEVRİLMEZ.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>(this.readInitial());

  constructor() {
    // <html lang="..."> güncel kalsın (SEO + erişilebilirlik).
    effect(() => {
      if (typeof document !== 'undefined') {
        document.documentElement.lang = this.lang();
      }
    });
  }

  private readInitial(): Lang {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'tr' || saved === 'en') { return saved; }
      // İlk ziyaret: tarayıcı dili İngilizce ise EN, değilse TR.
      const nav = (navigator?.language || 'tr').toLowerCase();
      return nav.startsWith('en') ? 'en' : 'tr';
    } catch {
      return 'tr';
    }
  }

  set(lang: Lang): void {
    this.lang.set(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* sessiz */ }
  }

  toggle(): void {
    this.set(this.lang() === 'tr' ? 'en' : 'tr');
  }

  /** Anahtarı aktif dile çevirir. Bulamazsa TR'ye, o da yoksa anahtarın kendisine düşer. */
  t(key: string, params?: Record<string, string | number>): string {
    const lang = this.lang();
    let value = DICT[lang][key] ?? DICT.tr[key] ?? key;
    if (params) {
      for (const p of Object.keys(params)) {
        value = value.replace(new RegExp(`\\{${p}\\}`, 'g'), String(params[p]));
      }
    }
    return value;
  }
}
