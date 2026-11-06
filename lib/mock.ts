/**
 * Ağ erişimi olmadan geliştirme için sahte veri (DATA_SOURCE=mock).
 * Bugünden 8 hafta öncesine ve 4 hafta sonrasına tutarlı bir sezon üretir.
 */
import type { LeagueLogo, Lineup, Match, MatchDetail, Player, PositionGroup, StandingRow, Team, TeamInfo, TeamSchedule } from "./types";
import { shiftDays, ymd } from "./format";
import { momentum, type Play } from "./momentum";
import { rateLineups } from "./rating";

const T = (id: string, name: string, abbr: string): Team => ({ id, name, short: name, abbr });

const TEAMS: Record<string, Team[]> = {
  "tur.1": [
    T("1", "Galatasaray", "GS"), T("2", "Fenerbahçe", "FB"), T("3", "Beşiktaş", "BJK"), T("4", "Trabzonspor", "TS"),
    T("5", "Başakşehir", "IBFK"), T("6", "Samsunspor", "SAM"), T("7", "Göztepe", "GÖZ"), T("8", "Eyüpspor", "EYP"),
  ],
  "eng.1": [T("11", "Arsenal", "ARS"), T("12", "Liverpool", "LIV"), T("13", "Manchester City", "MCI"), T("14", "Chelsea", "CHE")],
  "esp.1": [T("21", "Real Madrid", "RMA"), T("22", "Barcelona", "BAR"), T("23", "Atlético Madrid", "ATM"), T("24", "Sevilla", "SEV")],
};

function rng(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1000) / 1000;
}

const WEEKS_BACK = 8, WEEKS_AHEAD = 4;

function season(league: string): Match[] {
  const teams = TEAMS[league];
  if (!teams) return [];
  const n = teams.length;
  const out: Match[] = [];
  let order = teams.map((_, i) => i);
  for (let w = -WEEKS_BACK; w <= WEEKS_AHEAD; w++) {
    const day = shiftDays(new Date(), w * 7);
    const key = ymd(day);
    const iso = `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
    for (let k = 0; k < n / 2; k++) {
      let [hi, ai] = [order[k], order[n - 1 - k]];
      if ((w + k) % 2) [hi, ai] = [ai, hi];
      const r = rng(`${league}${w}${k}`);
      const state: Match["state"] = w < 0 ? "post" : w > 0 ? "pre" : k === 0 ? "in" : k === 1 ? "post" : "pre";
      const hs = Math.floor(r() * 4), as = Math.floor(r() * 3);
      const hour = 15 + k * 2;
      out.push({
        id: `${league}_${key}_${k}`,
        league,
        date: `${iso}T${String(hour).padStart(2, "0")}:00:00+03:00`,
        state,
        clock: state === "in" ? "67'" : undefined,
        detail: state === "post" ? "MS" : state === "in" ? "67'" : "",
        home: { team: teams[hi], score: state === "pre" ? undefined : hs, winner: state === "post" && hs > as },
        away: { team: teams[ai], score: state === "pre" ? undefined : as, winner: state === "post" && as > hs },
      });
    }
    order = [order[0], order[n - 1], ...order.slice(1, n - 1)];
  }
  return out;
}

const dayOf = (m: Match) => ymd(new Date(m.date));

export async function scoreboard(league: string, yyyymmdd: string, _revalidate?: number): Promise<Match[]> {
  return season(league).filter((m) => dayOf(m) === yyyymmdd);
}

export async function scoreboardRange(league: string, from: string, to: string, _revalidate?: number): Promise<Match[]> {
  return season(league).filter((m) => dayOf(m) >= from && dayOf(m) <= to);
}

const FIRST = ["Emre", "Arda", "Kerem", "Burak", "Mert", "Cenk", "Ozan", "Kaan", "Barış", "Efe", "Yusuf", "Deniz", "Can", "Umut", "Hakan", "Onur", "Selim", "Tolga", "Eren", "Volkan", "Serkan", "Alp"];
const LAST = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Aydın", "Öztürk", "Arslan", "Doğan", "Koç", "Kurt", "Aksoy", "Polat", "Erdem", "Güneş", "Tekin", "Uçar", "Bulut", "Sezer", "Kılıç", "Acar", "Tan"];
const LAYOUT: PositionGroup[] = ["G", "D", "D", "D", "D", "M", "M", "M", "F", "F", "F", "G", "D", "D", "M", "M", "F", "F", "M", "D", "G", "F"];
const POS_LABEL: Record<PositionGroup, string> = { G: "K", D: "D", M: "OS", F: "F", "?": "" };

function squad(t: Team): Player[] {
  const r = rng("sq" + t.id);
  return LAYOUT.map((pos, i) => ({
    id: `${t.id}-${i}`,
    name: `${FIRST[(i + Number(t.id)) % FIRST.length]} ${LAST[Math.floor(r() * LAST.length)]}`,
    number: String(i + 1),
    pos,
    posLabel: POS_LABEL[pos],
    age: 19 + Math.floor(r() * 15),
    nationality: r() > 0.3 ? "Türkiye" : "Brezilya",
  }));
}

function lineup(t: Team, side: "home" | "away"): Lineup {
  const p = squad(t);
  return {
    side,
    formation: "4-3-3",
    players: p.map((x, i) => ({
      ...x,
      starter: i < 11,
      subbedOut: i === 9,
      subbedIn: i === 14,
      stats: {
        totalGoals: i === 10 ? 1 : 0, goalAssists: i === 8 ? 1 : 0, totalShots: (i * 7) % 4, shotsOnTarget: (i * 3) % 2,
        saves: i === 0 ? 4 : 0, goalsConceded: 1, yellowCards: i === 5 ? 1 : 0, foulsCommitted: i % 3, foulsSuffered: (i * 5) % 3,
      },
    })),
  };
}

export async function matchDetail(league: string, id: string, _revalidate?: number): Promise<MatchDetail> {
  const all = season(league);
  const m = all.find((x) => x.id === id);
  if (!m) throw new Error("Maç bulunamadı");
  const pair = new Set([m.home.team.id, m.away.team.id]);
  const h2h = all
    .filter((x) => x.id !== id && x.state === "post" && pair.has(x.home.team.id) && pair.has(x.away.team.id))
    .sort((a, b) => b.date.localeCompare(a.date));
  const started = m.state !== "pre";
  const r = rng("pl" + id);
  const upTo = m.state === "in" ? 67 : m.state === "post" ? 94 : 0;
  const plays: Play[] = [{ minute: "1'", min: 1, kind: "period", text: "İlk yarı başladı." }];
  const H = m.home.team.name, A = m.away.team.name;
  for (let min = 2; min <= upTo; min++) {
    const x = r();
    if (x > 0.32) continue;
    const side = r() < (min < 50 ? 0.62 : 0.4) ? "home" : "away";
    const t = side === "home" ? H : A;
    const who = squad(side === "home" ? m.home.team : m.away.team)[5 + Math.floor(r() * 6)].name;
    const kinds: [Play["kind"], string][] = [
      ["shot-on", `Kurtarış. ${who} (${t}) ceza sahası içinden sağ ayakla şut.`],
      ["shot", `Şut dışarıda. ${who} (${t}) ceza sahası dışından sol ayakla şut.`],
      ["corner", `Korner, ${t}.`],
      ["foul", `Faul: ${who} (${t}).`],
    ];
    const [kind, text] = kinds[Math.floor(r() * kinds.length)];
    plays.push({ minute: `${min}'`, min, kind, side, text });
  }
  if (upTo >= 12) plays.push({ minute: "12'", min: 12, kind: "goal", side: "home", text: `GOL! ${H}. ${squad(m.home.team)[9].name} (${H}) sağ ayakla sol alt köşeye.` });
  if (upTo >= 61) plays.push({ minute: "61'", min: 61, kind: "goal", side: "away", text: `GOL! ${A}. ${squad(m.away.team)[8].name} (${A}) kafa vuruşu.` });
  if (upTo >= 46) plays.push({ minute: "45'+2'", min: 47, kind: "period", text: "İlk yarı bitti." });
  if (m.state === "post") plays.push({ minute: "90'+4'", min: 94, kind: "period", text: "Maç bitti." });
  plays.sort((a, b) => a.min - b.min);
  return {
    ...m,
    plays,
    momentum: momentum(plays, m.state === "in" ? upTo : undefined),
    venue: "Örnek Stadyumu",
    events: started
      ? [
          { minute: "12'", kind: "goal", side: "home", text: squad(m.home.team)[9].name },
          { minute: "34'", kind: "yellow", side: "away", text: squad(m.away.team)[3].name },
          { minute: "58'", kind: "sub", side: "away", text: `${squad(m.away.team)[14].name} / ${squad(m.away.team)[9].name}` },
          { minute: "61'", kind: "goal", side: "away", text: squad(m.away.team)[8].name },
        ]
      : [],
    stats: started
      ? [
          { label: "Topla oynama", home: "56%", away: "44%" },
          { label: "Şut", home: "11", away: "7" },
          { label: "İsabetli şut", home: "5", away: "3" },
          { label: "Korner", home: "6", away: "2" },
          { label: "Faul", home: "9", away: "13" },
        ]
      : [],
    lineups: started ? rateLineups([lineup(m.home.team, "home"), lineup(m.away.team, "away")], m.home.score, m.away.score) : [lineup(m.home.team, "home"), lineup(m.away.team, "away")],
    h2h,
  };
}

export async function standings(league: string): Promise<StandingRow[]> {
  const rows = new Map<string, StandingRow>();
  for (const t of TEAMS[league] ?? []) rows.set(t.id, { rank: 0, team: t, played: 0, won: 0, drawn: 0, lost: 0, gd: 0, points: 0 });
  for (const m of season(league)) {
    if (m.state !== "post") continue;
    const h = rows.get(m.home.team.id)!, a = rows.get(m.away.team.id)!;
    const hs = m.home.score ?? 0, as = m.away.score ?? 0;
    h.played++; a.played++; h.gd += hs - as; a.gd += as - hs;
    if (hs > as) { h.won++; a.lost++; h.points += 3; }
    else if (hs < as) { a.won++; h.lost++; a.points += 3; }
    else { h.drawn++; a.drawn++; h.points++; a.points++; }
  }
  return [...rows.values()]
    .sort((x, y) => y.points - x.points || y.gd - x.gd)
    .map((r, i) => ({ ...r, rank: i + 1, note: i === 0 ? "Şampiyonlar Ligi" : undefined }));
}

function findTeam(league: string, id: string) {
  const t = TEAMS[league]?.find((x) => x.id === id);
  if (!t) throw new Error("Takım bulunamadı");
  return t;
}

export async function teamInfo(league: string, id: string): Promise<TeamInfo> {
  return { team: findTeam(league, id), venue: "Örnek Stadyumu" };
}

export async function teamSchedule(league: string, id: string): Promise<TeamSchedule> {
  findTeam(league, id);
  const mine = season(league).filter((m) => m.home.team.id === id || m.away.team.id === id);
  return {
    past: mine.filter((m) => m.state !== "pre").sort((a, b) => b.date.localeCompare(a.date)),
    upcoming: mine.filter((m) => m.state === "pre").sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function roster(league: string, id: string): Promise<Player[]> {
  return squad(findTeam(league, id));
}

export async function leagueLogo(_league: string): Promise<LeagueLogo> {
  void _league;
  return {};
}

export async function playerProfile(league: string, id: string): Promise<import("./types").PlayerProfile> {
  const teamId = id.split("-")[0];
  const t = findTeam(league, teamId);
  const p = squad(t).find((x) => x.id === id);
  if (!p) throw new Error("Oyuncu bulunamadı");
  const r = rng("pl" + id);
  const n = (k: number) => String(Math.floor(r() * k));
  const g = p.pos === "F" ? n(12) : p.pos === "M" ? n(5) : "0";
  return {
    id, league, name: p.name, number: p.number, position: { G: "Kaleci", D: "Defans", M: "Orta saha", F: "Forvet", "?": "" }[p.pos],
    pos: p.pos, age: p.age, birth: `${2026 - (p.age ?? 25)}-03-12`, height: `${170 + Math.floor(r() * 25)} cm`, weight: `${65 + Math.floor(r() * 20)} kg`,
    nationality: p.nationality, team: t, teamColor: t.id === "1" ? "a90432" : "14213d",
    summary: [["Maç", "10"], ["Gol", g], ["Asist", n(5)], ["Şut", n(30)]],
    stats: {
      labels: ["STRT", "FC", "FA", "YC", "RC", "G", "A", "SHOT", "SOG", "OFF"],
      names: ["starts", "foulsCommitted", "foulsSuffered", "yellowCards", "redCards", "totalGoals", "goalAssists", "totalShots", "shotsOnTarget", "offsides"],
      splits: [
        { name: "2026-27 Lig", teamId: t.id, league, stats: ["10", n(12), n(12), n(4), "0", g, n(5), n(30), n(15), n(4)] },
        { name: "2025-26 Lig", teamId: t.id, league, stats: ["31", n(30), n(30), n(8), n(2), String(Number(g) * 3), n(9), n(80), n(40), n(9)] },
      ],
    },
  };
}

export async function transfers(league: string): Promise<import("./types").Transfer[]> {
  const ts = TEAMS[league] ?? [];
  if (ts.length < 3) return [];
  return [
    { date: "2026-08-30T10:00Z", player: "Emre Yılmaz", playerId: `${ts[0].id}-9`, from: ts[2], to: ts[0], fee: "€12 mn" },
    { date: "2026-08-12T10:00Z", player: "Can Demir", from: ts[0], to: ts[1], fee: "Kiralık" },
    { date: "2026-07-05T10:00Z", player: "Mert Kaya", from: undefined, to: ts[0], fee: "Bonservissiz" },
  ];
}

export async function leaders(league: string): Promise<import("./types").LeagueLeaders> {
  const ts = TEAMS[league] ?? [];
  const mk = (n: number) => ts.flatMap((t, i) => squad(t).slice(8, 10).map((p, j) => ({ player: p.name, playerId: p.id, team: t, value: Math.max(1, n - i - j * 2) }))).sort((a, b) => b.value - a.value).slice(0, 10);
  return { goals: mk(11), assists: mk(6) };
}
