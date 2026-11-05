import { currentTz } from "./tz";

/**
 * Gün hesabı (Bugün, tarih şeridi, hangi maç hangi günde) seçili saat dilimine göre yapılır:
 * ABD modunda akşam saatlerinde Türkiye'de ertesi gün başlamış olsa da "Bugün" ABD'deki bugündür.
 * Eskiden her iki modda Türkiye takvimi kullanılıyordu; ABD'de akşam "yarınki" Avrupa kupası
 * maçları Bugün'de görünüyor, ertesi güne tıklayınca bulunamıyordu.
 *
 * Önbelleğe alınan fonksiyonların içinde istek bilgisi olmayabilir: orada tz açıkça verilmeli.
 */
export function ymd(d: Date, tz: string = currentTz()): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return p.replace(/-/g, "");
}

export function parseYmd(s: string | undefined): Date {
  if (s && /^\d{8}$/.test(s)) return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T12:00:00Z`);
  return new Date();
}

export function shiftDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

export const kickoff = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { timeZone: currentTz(), hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export const dayLabel = (d: Date) =>
  new Intl.DateTimeFormat("tr-TR", { timeZone: currentTz(), weekday: "short", day: "numeric", month: "short" }).format(d);

export const longDate = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { timeZone: currentTz(), weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { timeZone: currentTz(), day: "numeric", month: "short" }).format(new Date(iso));

export const fullDay = (d: Date) =>
  new Intl.DateTimeFormat("tr-TR", { timeZone: currentTz(), weekday: "long", day: "numeric", month: "long" }).format(d);

/** Seçili saat diliminde şu anki saat (0-23) */
export const hourNow = (d: Date = new Date()) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: currentTz(), hour: "2-digit", hourCycle: "h23" }).format(d));

/** Verilen tarihin haftasının pazartesisi (seçili saat dilimine göre) */
export function mondayOf(d: Date): Date {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: currentTz(), weekday: "short" }).format(d);
  const idx = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd);
  return shiftDays(d, -Math.max(idx, 0));
}
