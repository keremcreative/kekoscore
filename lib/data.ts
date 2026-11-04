import { LEAGUES } from "./leagues";
import type { LeagueLogo, Match } from "./types";
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
