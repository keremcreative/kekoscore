import { parseYmd, shiftDays, ymd } from "./format";
import type { Match } from "./types";

export type Filter = "hepsi" | "canli" | "biten";

/** Dünün maçları Türkiye saatiyle bu saate kadar "Bugün" listesinde kalır */
const KEEP_YESTERDAY_UNTIL = 12;

const trHour = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", hourCycle: "h23" }).format(d));

/**
 * Ana sayfada seçili gün: hangi aralığın çekileceği ve hangi maçların gösterileceği.
 * Sayfa ve sonradan açılan kapalı lig kartları aynı kuralı kullansın diye tek yerde.
 */
export function homeDay(d: string | undefined, filter: Filter, now = new Date()) {
  const date = parseYmd(d);
  const key = ymd(date);
  const today = ymd(now);
  const isToday = key === today;
  // Bugün açıkken dünün maçlarını da çek: gece biten ya da hâlâ süren maçlar kaybolmasın
  const from = isToday ? ymd(shiftDays(now, -1)) : key;
  const keepYesterday = trHour(now) < KEEP_YESTERDAY_UNTIL;
  const visible = (m: Match) => {
    if (ymd(new Date(m.date)) === key) return true;
    // dünden kalanlar: süren maçlar her zaman, bitenler öğlene kadar
    return m.state === "in" || (m.state === "post" && keepYesterday);
  };
  const pass = (m: Match) => (filter === "canli" ? m.state === "in" : filter === "biten" ? m.state === "post" : true);
  /** Ligin o günkü maçları: görünenler, saat sırasıyla */
  const dayList = (r: Match[] | null) => (r ? r.filter(visible).sort((a, b) => a.date.localeCompare(b.date)) : []);
  return { date, key, today, isToday, from, visible, pass, dayList };
}

/** Seçili günden olmayan (dünden kalan) maçlara küçük "Dün" etiketi */
export const dayTag = (m: Match, key: string) => (ymd(new Date(m.date)) < key ? "Dün" : undefined);
