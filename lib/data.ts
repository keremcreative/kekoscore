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
 * Ana sayfa için tüm liglerin maçları tek önbellek kaydında (20 sn). Her açılışta ~95 ayrı
 * önbellek okuması yerine tek okuma yapılır; sekmeler arası geçiş hızlanır. Alınamayan lig null.
 */
/** Ana sayfanın asla eksik gösterilmemesi gereken ligleri (Süper Lig, 5 büyük lig, Avrupa kupaları) */
export const MUST = new Set(["tur.1", "eng.1", "esp.1", "ita.1", "ger.1", "fra.1", "uefa.champions", "uefa.europa", "uefa.europa.conf"]);
/** Bu sunucu örneğinde ana ligler en son ne zaman eksiksiz alındı */
let lastComplete = 0;

export const getAllLeagueDays = unstable_cache(
  async (from: string, to: string): Promise<(Match[] | null)[]> => {
    // Önemli ligler sıranın başına: ESPN yavaşken ilk onlar istenir
    const order = LEAGUES.map((_, i) => i).sort((a, b) => Number(MUST.has(LEAGUES[b].code)) - Number(MUST.has(LEAGUES[a].code)));
    const rs: (Match[] | null)[] = LEAGUES.map(() => null);
    await Promise.all(order.map(async (i) => (rs[i] = await getTrDays(LEAGUES[i].code, from, to).catch(() => null))));
    // Hiçbir lig alınamadıysa bunu önbelleğe yazma; yoksa sayfa 20 sn boyunca boş kalır
    if (rs.every((r) => r === null)) throw new Error("ESPN'den hiçbir lig alınamadı");
    // Ana liglerden biri düştüyse bir kez daha dene (kuyruk artık boş)
    const missing = LEAGUES.map((l, i) => i).filter((i) => rs[i] === null && MUST.has(LEAGUES[i].code));
    await Promise.all(missing.map(async (i) => (rs[i] = await getTrDays(LEAGUES[i].code, from, to).catch(() => null))));
    if (missing.some((i) => rs[i] === null)) {
      // Hâlâ eksikse kaydetme: önbellekteki son eksiksiz liste gösterilmeye devam eder
      // (Şampiyonlar Ligi'nin ana sayfadan kaybolması yerine birkaç saniyelik eski skor).
      // Ama ESPN uzun süre sorun çıkarırsa skorlar donmasın diye 3 dakikadan sonra eksik haliyle yaz.
      if (Date.now() - lastComplete < 180e3) throw new Error("Ana ligler alınamadı");
    } else lastComplete = Date.now();
    return rs;
  },
  ["tum-ligler-v2", process.env.DATA_SOURCE ?? "espn"],
  { revalidate: 20 },
);

/** Lig logoları tek kayıtta, günde bir yenilenir */
export const getLeagueLogosCached = unstable_cache(getLeagueLogos, ["lig-logolari-v1", process.env.DATA_SOURCE ?? "espn"], { revalidate: 86400 });
