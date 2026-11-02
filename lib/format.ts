import { currentTz } from "./tz";

/**
 * Gün hesabı her iki modda da Türkiye takvimine göre yapılır ki "Bugün" ve maç
 * listeleri aynı kalsın; yalnızca gösterilen saatler seçili saat dilimine göre değişir.
 */
const DAY_TZ = "Europe/Istanbul";

/** Türkiye takvimine göre YYYYMMDD */
export function ymd(d: Date): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: DAY_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
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

/** Verilen tarihin haftasının pazartesisi (Türkiye takvimi) */
export function mondayOf(d: Date): Date {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: DAY_TZ, weekday: "short" }).format(d);
  const idx = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd);
  return shiftDays(d, -Math.max(idx, 0));
}
