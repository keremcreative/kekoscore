"use server";
import { MatchRow } from "@/components/MatchRow";
import { getTrDays } from "./data";
import { dayTag, homeDay, type Filter } from "./homeDay";
import { leagueByCode } from "./leagues";
import { initTz } from "./tz";

/**
 * Ana sayfada kapalı gelen lig kartı açılınca maç satırları buradan gelir. Böylece
 * ~120 küçük ligin satırları her açılışta sayfayla birlikte gönderilmez.
 */
export async function leagueRows(code: string, d: string, filter: Filter) {
  if (!leagueByCode(code)) return null;
  await initTz();
  const { key, from, pass, dayList } = homeDay(d || undefined, filter);
  const matches = dayList(await getTrDays(code, from, key).catch(() => null)).filter(pass);
  if (!matches.length) return <p className="ls-empty">Maç bilgisi alınamadı.</p>;
  return matches.map((m) => <MatchRow key={m.id} m={m} dayTag={dayTag(m, key)} />);
}
