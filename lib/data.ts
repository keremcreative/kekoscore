import { unstable_cache } from "next/cache";
import { LEAGUES, leagueByCode } from "./leagues";
import { teamCoach } from "./wiki";
import type { Coach, LeagueLogo, Match, Team } from "./types";
import { parseYmd, shiftDays, ymd } from "./format";
import * as espn from "./espn";
import * as mock from "./mock";

/** Veri kaynağı: DATA_SOURCE=espn (varsayılan) veya mock */
const source = process.env.DATA_SOURCE === "mock" ? mock : espn;

export const getScoreboard = source.scoreboard;
export const getScoreboardRange = source.scoreboardRange;
export const getMatch = source.matchDetail;
export const getStandings = source.standings;
export const getTeamInfo = source.teamInfo;
export const getTeamSchedule = source.teamSchedule;
export const getRoster = source.roster;
export const getLeagueLogo = source.leagueLogo;
export const getPlayer = source.playerProfile;
export const getTransfers = source.transfers;
export const getLeaders = source.leaders;

/**
 * Türkiye takvimine göre [from, to] günlerinin maçları. ESPN günleri ABD saatine göre
 * böldüğü için (TR'de gece 02:00'deki MLS maçı ESPN'de bir önceki gündedir) bir gün
 * öncesinden başlayarak tek istekte çekip Türkiye gününe göre süzüyoruz.
 */
export async function getTrDays(code: string, from: string, to: string = from): Promise<Match[]> {
  const today = ymd(new Date());
  const espnFrom = ymd(shiftDays(parseYmd(from), -1));
  const fresh = to >= ymd(shiftDays(new Date(), -1)) && from <= today;
  const list = await source.scoreboardRange(code, espnFrom, to, fresh ? 20 : 600);
  const seen = new Set<string>();
  return list.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    const d = ymd(new Date(m.date));
    return d >= from && d <= to;
  });
}

/** Tüm liglerin logoları; biri alınamazsa o lig bayrakla gösterilir */
export async function getLeagueLogos(): Promise<Record<string, LeagueLogo>> {
  const rs = await Promise.allSettled(LEAGUES.map((l) => source.leagueLogo(l.code)));
  return Object.fromEntries(LEAGUES.map((l, i) => [l.code, rs[i].status === "fulfilled" ? (rs[i] as PromiseFulfilledResult<LeagueLogo>).value : {}]));
}

export const dataSourceName = process.env.DATA_SOURCE === "mock" ? "Örnek veri" : "ESPN";

/** Takımın teknik direktörü. ESPN vermediği için Wikidata'dan; bulunamazsa undefined. */
export async function getCoach(league: string, team: Team): Promise<Coach | undefined> {
  if (process.env.DATA_SOURCE === "mock") return { name: "Okan Örnek", age: 52, nationality: "Türkiye" };
  const lg = leagueByCode(league);
  if (lg?.group === "Kadınlar") return undefined; // aynı adlı erkek takımın hocası çıkmasın
  const national = lg?.group === "Milli takımlar" && league !== "club.friendly";
  return teamCoach(team.name, national);
}

/**
 * Ana sayfa ligleri iki gruba ayrılır: "ana" (Süper Lig, büyük ligler, Avrupa kupaları,
 * önemli kupalar; ~50 lig) ve "diğer" (kalan ~120 lig). Ana sayfa önce ana grubu bekleyip
 * hemen gösterir, diğer grup arkadan akar; 172 ligin hepsini beklemek gerekmez.
 */
export type LeagueGroup = "ana" | "diger";
export const groupOf = (code: string): LeagueGroup => ((leagueByCode(code)?.tier ?? 3) <= 2 ? "ana" : "diger");
const GROUPS: Record<LeagueGroup, typeof LEAGUES> = {
  ana: LEAGUES.filter((l) => groupOf(l.code) === "ana"),
  diger: LEAGUES.filter((l) => groupOf(l.code) === "diger"),
};
export const groupLeagues = (g: LeagueGroup) => GROUPS[g];

/**
 * Bir grubun tüm liglerinin maçları tek önbellek kaydında (20 sn). Kayıt bayatladığında
 * eski veri hemen verilir, yenisi arka planda hazırlanır. Alınamayan lig null.
 */
export const getGroupDays = unstable_cache(
  async (group: LeagueGroup, from: string, to: string): Promise<(Match[] | null)[]> => {
    const rs = await Promise.all(GROUPS[group].map((l) => getTrDays(l.code, from, to).catch(() => null)));
    // Hiçbir lig alınamadıysa bunu önbelleğe yazma (yoksa sayfa 20 sn boyunca boş kalır)
    if (rs.every((r) => r === null)) throw new Error("ESPN'den hiçbir lig alınamadı");
    return rs;
  },
  ["lig-grubu-v2", process.env.DATA_SOURCE ?? "espn"],
  { revalidate: 20 },
);

/** Tüm liglerin maçları, LEAGUES sırasıyla (arama sayfası için) */
/** Grup alınamazsa tüm ligleri null say */
export const getGroupDaysSafe = (group: LeagueGroup, from: string, to: string) =>
  getGroupDays(group, from, to).catch(() => GROUPS[group].map(() => null as Match[] | null));

export async function getAllLeagueDays(from: string, to: string): Promise<(Match[] | null)[]> {
  const [ana, diger] = await Promise.all([getGroupDaysSafe("ana", from, to), getGroupDaysSafe("diger", from, to)]);
  const by = new Map<string, Match[] | null>();
  GROUPS.ana.forEach((l, i) => by.set(l.code, ana[i]));
  GROUPS.diger.forEach((l, i) => by.set(l.code, diger[i]));
  return LEAGUES.map((l) => by.get(l.code) ?? null);
}

/** Lig logoları tek kayıtta, günde bir yenilenir */
export const getLeagueLogosCached = unstable_cache(getLeagueLogos, ["lig-logolari-v1", process.env.DATA_SOURCE ?? "espn"], { revalidate: 86400 });
