/** Ağ erişimi olmadan geliştirme için sahte veri (DATA_SOURCE=mock). */
import type { Match, MatchDetail, StandingRow, Team } from "./types";
import { ymd } from "./format";

const T = (id: string, name: string, abbr: string): Team => ({ id, name, short: name, abbr });

const TEAMS: Record<string, Team[]> = {
  "tur.1": [
    T("1", "Galatasaray", "GS"), T("2", "Fenerbahçe", "FB"), T("3", "Beşiktaş", "BJK"), T("4", "Trabzonspor", "TS"),
    T("5", "Başakşehir", "IBFK"), T("6", "Samsunspor", "SAM"), T("7", "Göztepe", "GÖZ"), T("8", "Eyüpspor", "EYP"),
  ],
  "eng.1": [
    T("11", "Arsenal", "ARS"), T("12", "Liverpool", "LIV"), T("13", "Manchester City", "MCI"), T("14", "Chelsea", "CHE"),
  ],
  "esp.1": [T("21", "Real Madrid", "RMA"), T("22", "Barcelona", "BAR"), T("23", "Atlético Madrid", "ATM"), T("24", "Sevilla", "SEV")],
};

function seed(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1000) / 1000;
}

export async function scoreboard(league: string, yyyymmdd: string): Promise<Match[]> {
  const teams = TEAMS[league];
  if (!teams) return [];
  const r = seed(league + yyyymmdd);
  const day = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
  const today = ymd(new Date());
  const out: Match[] = [];
  for (let i = 0; i + 1 < teams.length; i += 2) {
    const hour = 15 + i;
    const past = yyyymmdd < today;
    const live = yyyymmdd === today && i === 0;
    const state = past ? "post" : live ? "in" : yyyymmdd === today && i === 2 ? "post" : "pre";
    const hs = Math.floor(r() * 4), as = Math.floor(r() * 3);
    out.push({
      id: `${league}-${yyyymmdd}-${i}`,
      league,
      date: `${day}T${String(hour).padStart(2, "0")}:00:00Z`,
      state,
      clock: state === "in" ? "67'" : undefined,
      detail: state === "post" ? "MS" : state === "in" ? "67'" : "",
      home: { team: teams[i], score: state === "pre" ? undefined : hs, winner: state === "post" && hs > as },
      away: { team: teams[i + 1], score: state === "pre" ? undefined : as, winner: state === "post" && as > hs },
    });
  }
  return out;
}

export async function matchDetail(league: string, id: string): Promise<MatchDetail> {
  const yyyymmdd = id.split("-").at(-2) ?? "";
  const m = (await scoreboard(league, yyyymmdd)).find((x) => x.id === id);
  if (!m) throw new Error("Maç bulunamadı");
  return {
    ...m,
    venue: "Örnek Stadyumu",
    events:
      m.state === "pre"
        ? []
        : [
            { minute: "12'", kind: "goal", side: "home", text: "Oyuncu A" },
            { minute: "34'", kind: "yellow", side: "away", text: "Oyuncu B" },
            { minute: "58'", kind: "sub", side: "away", text: "Oyuncu C / Oyuncu D" },
            { minute: "61'", kind: "goal", side: "away", text: "Oyuncu E" },
          ],
    stats:
      m.state === "pre"
        ? []
        : [
            { label: "Topla oynama", home: "56%", away: "44%" },
            { label: "Şut", home: "11", away: "7" },
            { label: "İsabetli şut", home: "5", away: "3" },
            { label: "Korner", home: "6", away: "2" },
            { label: "Faul", home: "9", away: "13" },
          ],
  };
}

export async function standings(league: string): Promise<StandingRow[]> {
  const teams = TEAMS[league] ?? [];
  const r = seed(league);
  return teams
    .map((team) => {
      const won = Math.floor(r() * 8), drawn = Math.floor(r() * 4), lost = Math.floor(r() * 5);
      return { rank: 0, team, played: won + drawn + lost, won, drawn, lost, gd: Math.floor(r() * 20) - 8, points: won * 3 + drawn };
    })
    .sort((a, b) => b.points - a.points || b.gd - a.gd)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}
