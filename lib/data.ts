import * as espn from "./espn";
import * as mock from "./mock";

/** Veri kaynağı: DATA_SOURCE=espn (varsayılan) veya mock */
const source = process.env.DATA_SOURCE === "mock" ? mock : espn;

export const getScoreboard = source.scoreboard;
export const getMatch = source.matchDetail;
export const getStandings = source.standings;
export const dataSourceName = process.env.DATA_SOURCE === "mock" ? "Örnek veri" : "ESPN";
