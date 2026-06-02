/**
 * Kısa ömürlü token → profil önbelleği.
 *
 * AuthGuard / AdminGuard her istekte Supabase'e iki ardışık ağ çağrısı yapar
 * (auth.getUser + profiles select). Sıcak serverless örneğinde aynı token için
 * bu sonucu birkaç saniye cache'leyerek istek başına gecikmeyi düşürürüz.
 * TTL kısa tutulur (token iptali en geç bu süre içinde etkili olur).
 */
export interface CachedProfile {
  id: string;
  role: 'user' | 'dealer' | 'admin';
  status: string;
}

const TTL_MS = 30_000;
const MAX_ENTRIES = 500;
const cache = new Map<string, { profile: CachedProfile; exp: number }>();

export function getCachedProfile(token: string): CachedProfile | null {
  const hit = cache.get(token);
  if (!hit) { return null; }
  if (Date.now() > hit.exp) { cache.delete(token); return null; }
  return hit.profile;
}

export function setCachedProfile(token: string, profile: CachedProfile): void {
  cache.set(token, { profile, exp: Date.now() + TTL_MS });
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) { cache.delete(oldest); }
  }
}
