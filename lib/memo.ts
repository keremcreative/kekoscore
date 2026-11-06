/**
 * Sunucu örneğinin belleğinde kısa süreli önbellek (Vercel önbelleğine YAZMAZ, kota harcamaz).
 * Canlı skorlar için: süresi dolan kayıt asla gösterilmez, aynı anda gelen istekler tek ESPN çağrısını paylaşır.
 * Hata olursa kaydedilmez.
 */
const store = new Map<string, { at: number; p: Promise<unknown> }>();

export function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.at < ttlMs) return hit.p as Promise<T>;
  const p = fn();
  store.set(key, { at: now, p });
  p.catch(() => store.get(key)?.p === p && store.delete(key));
  if (store.size > 200) for (const [k, v] of store) if (now - v.at > 600e3) store.delete(k);
  return p;
}
