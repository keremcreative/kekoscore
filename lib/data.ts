import { LEAGUES } from "./leagues";
import type { LeagueLogo } from "./types";
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

/** Tüm liglerin logoları; biri alınamazsa o lig bayrakla gösterilir */
export async function getLeagueLogos(): Promise<Record<string, LeagueLogo>> {
  const rs = await Promise.allSettled(LEAGUES.map((l) => source.leagueLogo(l.code)));
  return Object.fromEntries(LEAGUES.map((l, i) => [l.code, rs[i].status === "fulfilled" ? (rs[i] as PromiseFulfilledResult<LeagueLogo>).value : {}]));
}

export const dataSourceName = process.env.DATA_SOURCE === "mock" ? "Örnek veri" : "ESPN";
