/** Sipariş ekranlarında ortak gösterim yardımcıları (DB değerleri → TR metin). */

export function fuelLabelTr(fuel: string | null | undefined): string {
  const map: Record<string, string> = {
    petrol: 'Benzin', diesel: 'Dizel',
    petrol_mhev: 'Benzin MHEV', petrol_phev: 'Benzin PHEV', petrol_hybrid: 'Benzin Hibrit',
    diesel_mhev: 'Dizel MHEV', diesel_phev: 'Dizel PHEV', diesel_hybrid: 'Dizel Hibrit',
    ev: 'Elektrik', lpg: 'LPG',
  };
  return fuel ? (map[fuel] ?? fuel) : '';
}

export function stageLabel(stage: string): string {
  const map: Record<string, string> = { stage1: 'Stage 1', stage2: 'Stage 2', stage3: 'Stage 3' };
  return map[stage] ?? stage;
}

/** Ödeme durumu → TR etiket (sipariş durumundan ayrı sütun). */
export function paymentStatusLabel(ps: string): string {
  const map: Record<string, string> = {
    unpaid: 'Ödeme Bekliyor', paid: 'Ödendi', refunded: 'İade Edildi', failed: 'Başarısız',
  };
  return map[ps] ?? ps;
}

const TR_MONTHS_LONG = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const pad2 = (n: number): string => n.toString().padStart(2, '0');

/** ISO tarih → "02.06.2026" (gg.aa.yyyy). */
export function formatTrDate(iso: string | null | undefined): string {
  if (!iso) { return ''; }
  const d = new Date(iso);
  if (isNaN(d.getTime())) { return ''; }
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** ISO tarih → "02.06.2026 · 14:32". */
export function formatTrDateTime(iso: string | null | undefined): string {
  if (!iso) { return ''; }
  const d = new Date(iso);
  if (isNaN(d.getTime())) { return ''; }
  return `${formatTrDate(iso)} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** ISO tarih → "2026-06-02" (input[type=date] / datepicker değeri). */
export function isoDateOnly(iso: string | null | undefined): string {
  if (!iso) { return ''; }
  const d = new Date(iso);
  if (isNaN(d.getTime())) { return ''; }
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** (yıl, ay) → "Mayıs 2026". */
export function periodLabel(year: number, month: number): string {
  return `${TR_MONTHS_LONG[month - 1] ?? month} ${year}`;
}

/** Sayı → "₺2.500" (TR binlik ayraç). */
export function formatTl(value: number): string {
  return `₺${Math.round(value).toLocaleString('tr-TR')}`;
}

/**
 * Dosya indirmeyi tetikler. Yeni sekme açmadan doğrudan indirmek için
 * URL'i blob olarak çeker ve gizli bir <a> üzerinden download tetikler.
 */
export async function triggerDownload(url: string, fileName?: string): Promise<void> {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) { throw new Error(`download failed: ${res.status}`); }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName ?? '';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }
}
