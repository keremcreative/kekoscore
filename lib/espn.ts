/**
 * ESPN'in herkese açık (resmi olmayan, anahtarsız) futbol uç noktaları.
 * Yanıtları uygulamanın kendi tiplerine çeviriyoruz; ESPN şekli değiştirirse
 * yalnızca bu dosyayı düzeltmek yeterli. Her alan isteğe bağlı okunur ki
 * eksik veri sayfayı çökertmesin.
 */
import type {
  EventKind,
  LineupPlayer,
  Lineup,
  Match,
  MatchDetail,
  MatchEvent,
  MatchStat,
  Player,
  PositionGroup,
  Side,
  StandingRow,
  Team,
  TeamInfo,
  TeamSchedule,
} from "./types";

const SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const STANDINGS = "https://site.api.espn.com/apis/v2/sports/soccer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;

async function get(url: string, revalidate: number): Promise<J> {
  const res = await fetch(url, { next: { revalidate }, headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`ESPN ${res.status}: ${url}`);
  return res.json();
}

function team(t: J): Team {
  return {
    id: String(t?.id ?? ""),
    name: t?.displayName ?? t?.name ?? "?",
    short: t?.shortDisplayName ?? t?.displayName ?? t?.name ?? "?",
    abbr: t?.abbreviation ?? "",
    logo: t?.logo ?? t?.logos?.[0]?.href,
  };
}

function num(v: J): number | undefined {
  const n = typeof v === "object" && v !== null ? Number(v.value ?? v.displayValue) : Number(v);
  return v === undefined || v === null || v === "" || !Number.isFinite(n) ? undefined : n;
}

function side(c: J): Side {
  return { team: team(c?.team), score: num(c?.score), winner: c?.winner === true };
}

function toMatch(ev: J, league: string): Match {
  const comp = ev?.competitions?.[0] ?? ev;
  const status = comp?.status ?? ev?.status ?? {};
  const st = status?.type ?? {};
  const state: Match["state"] = st.state === "in" ? "in" : st.state === "post" ? "post" : "pre";
  const cs: J[] = comp?.competitors ?? [];
  const home = cs.find((c) => c.homeAway === "home") ?? cs[0];
  const away = cs.find((c) => c.homeAway === "away") ?? cs[1];
  const m: Match = {
    id: String(ev?.id ?? comp?.id),
    league: ev?.league?.slug ?? league,
    date: comp?.date ?? ev?.date,
    state,
    clock: state === "in" ? status?.displayClock : undefined,
    detail: st.shortDetail ?? st.detail ?? "",
    home: side(home),
    away: side(away),
  };
  // Bazı uç noktalar winner alanını vermiyor: skordan çıkar
  if (state === "post" && !m.home.winner && !m.away.winner && m.home.score !== undefined && m.away.score !== undefined) {
    m.home.winner = m.home.score > m.away.score;
    m.away.winner = m.away.score > m.home.score;
  }
  return m;
}

const events = (data: J, league: string): Match[] => (data?.events ?? []).map((e: J) => toMatch(e, league));

export async function scoreboard(league: string, yyyymmdd: string): Promise<Match[]> {
  return events(await get(`${SITE}/${league}/scoreboard?dates=${yyyymmdd}`, 20), league);
}

/** Tarih aralığındaki maçlar (YYYYMMDD-YYYYMMDD) */
export async function scoreboardRange(league: string, from: string, to: string): Promise<Match[]> {
  return events(await get(`${SITE}/${league}/scoreboard?dates=${from}-${to}&limit=200`, 60), league);
}

function kindOf(e: J): EventKind {
  const t = `${e?.type?.type ?? ""} ${e?.type?.text ?? ""}`.toLowerCase();
  if (t.includes("own")) return "own-goal";
  if (t.includes("penalty") && (t.includes("goal") || e?.scoringPlay)) return "penalty";
  if (e?.scoringPlay || t.includes("goal")) return "goal";
  if (t.includes("red")) return "red";
  if (t.includes("yellow")) return "yellow";
  if (t.includes("substitution")) return "sub";
  return "other";
}

function posGroup(p: J): PositionGroup {
  const a = `${p?.abbreviation ?? ""} ${p?.name ?? ""} ${p?.displayName ?? ""}`.toLowerCase();
  if (/\bg\b|goal|keeper/.test(a)) return "G";
  if (/\bd\b|def|back|\bcb\b|\blb\b|\brb\b/.test(a)) return "D";
  if (/\bm\b|mid|\bcm\b|\bdm\b|\bam\b/.test(a)) return "M";
  if (/\bf\b|forw|strik|wing|\bst\b|\bcf\b|\blw\b|\brw\b/.test(a)) return "F";
  return "?";
}

function player(a: J, pos: J): Player {
  const ath = a?.athlete ?? a;
  return {
    id: String(ath?.id ?? ""),
    name: ath?.displayName ?? ath?.fullName ?? "?",
    number: a?.jersey ?? ath?.jersey,
    pos: posGroup(pos ?? ath?.position),
    posLabel: (pos ?? ath?.position)?.abbreviation,
    age: num(ath?.age),
    nationality: ath?.citizenship ?? ath?.birthPlace?.country,
  };
}

function lineups(data: J, homeId: string): Lineup[] {
  return (data?.rosters ?? [])
    .map((r: J): Lineup => {
      const players: LineupPlayer[] = (r?.roster ?? []).map((p: J) => ({
        ...player(p, p?.position),
        starter: p?.starter === true,
        subbedIn: p?.subbedIn === true || p?.subbedIn?.didSub === true,
        subbedOut: p?.subbedOut === true || p?.subbedOut?.didSub === true,
      }));
      return {
        side: r?.homeAway === "home" || String(r?.team?.id) === homeId ? "home" : "away",
        formation: r?.formation,
        players,
      };
    })
    .filter((l: Lineup) => l.players.length);
}

function h2h(data: J, league: string, home: Team, away: Team): Match[] {
  const byId = new Map([[home.id, home], [away.id, away]]);
  const seen = new Set<string>();
  const out: Match[] = [];
  for (const g of data?.headToHeadGames ?? []) {
    for (const e of g?.events ?? []) {
      const id = String(e?.id ?? "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const hId = String(e?.homeTeamId ?? ""), aId = String(e?.awayTeamId ?? "");
      const ht = byId.get(hId), at = byId.get(aId);
      if (!ht || !at) continue;
      const hs = num(e?.homeTeamScore), as = num(e?.awayTeamScore);
      out.push({
        id,
        league,
        date: e?.gameDate ?? e?.date,
        state: "post",
        detail: "MS",
        home: { team: ht, score: hs, winner: hs !== undefined && as !== undefined && hs > as },
        away: { team: at, score: as, winner: hs !== undefined && as !== undefined && as > hs },
      });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
}

export async function matchDetail(league: string, id: string): Promise<MatchDetail> {
  const data = await get(`${SITE}/${league}/summary?event=${id}`, 15);
  const comp = data?.header?.competitions?.[0];
  const base = toMatch({ id, competitions: [comp] }, league);
  base.league = league;
  const homeId = base.home.team.id;

  const evs: MatchEvent[] = (data?.keyEvents ?? [])
    .map((e: J): MatchEvent => {
      const who = (e?.participants ?? []).map((p: J) => p?.athlete?.displayName).filter(Boolean);
      return {
        minute: e?.clock?.displayValue ?? "",
        kind: kindOf(e),
        side: String(e?.team?.id) === homeId ? "home" : "away",
        text: who.length ? who.join(" / ") : e?.text ?? e?.type?.text ?? "",
      };
    })
    .filter((e: MatchEvent) => e.kind !== "other" && e.minute);

  const teams: J[] = data?.boxscore?.teams ?? [];
  const h = teams.find((t) => String(t?.team?.id) === homeId) ?? teams[0];
  const a = teams.find((t) => t !== h) ?? teams[1];
  const stats: MatchStat[] = (h?.statistics ?? []).map((s: J) => ({
    label: s?.label ?? s?.name,
    home: s?.displayValue ?? "-",
    away: a?.statistics?.find((x: J) => x?.name === s?.name)?.displayValue ?? "-",
  }));

  return {
    ...base,
    venue: data?.gameInfo?.venue?.fullName,
    events: evs,
    stats,
    lineups: lineups(data, homeId),
    h2h: h2h(data, league, base.home.team, base.away.team).filter((m) => m.id !== id),
  };
}

export async function standings(league: string): Promise<StandingRow[]> {
  const data = await get(`${STANDINGS}/${league}/standings`, 300);
  const groups: J[] = data?.children?.length ? data.children : [data];
  const entries: J[] = groups.flatMap((g) => g?.standings?.entries ?? []);
  const stat = (e: J, ...names: string[]) => {
    for (const n of names) {
      const s = e?.stats?.find((x: J) => x?.name === n || x?.type === n);
      if (s) return Number(s.value ?? s.displayValue) || 0;
    }
    return 0;
  };
  return entries
    .map((e, i) => ({
      rank: stat(e, "rank") || i + 1,
      team: team(e?.team),
      played: stat(e, "gamesPlayed"),
      won: stat(e, "wins"),
      drawn: stat(e, "ties", "draws"),
      lost: stat(e, "losses"),
      gd: stat(e, "pointDifferential", "goalDifference"),
      points: stat(e, "points"),
      note: e?.note?.description,
    }))
    .sort((x, y) => x.rank - y.rank);
}

export async function teamInfo(league: string, id: string): Promise<TeamInfo> {
  const data = await get(`${SITE}/${league}/teams/${id}`, 3600);
  const t = data?.team ?? {};
  return { team: team(t), venue: t?.venue?.fullName, standingSummary: t?.standingSummary };
}

export async function teamSchedule(league: string, id: string): Promise<TeamSchedule> {
  const [past, next] = await Promise.allSettled([
    get(`${SITE}/${league}/teams/${id}/schedule`, 120),
    get(`${SITE}/${league}/teams/${id}/schedule?fixture=true`, 600),
  ]);
  const all = new Map<string, Match>();
  for (const r of [past, next]) {
    if (r.status === "fulfilled") for (const m of events(r.value, league)) all.set(m.id, m);
  }
  if (past.status === "rejected" && next.status === "rejected") throw past.reason;
  const list = [...all.values()].filter((m) => m.date);
  return {
    past: list.filter((m) => m.state !== "pre").sort((a, b) => b.date.localeCompare(a.date)),
    upcoming: list.filter((m) => m.state === "pre").sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function roster(league: string, id: string): Promise<Player[]> {
  const data = await get(`${SITE}/${league}/teams/${id}/roster`, 3600);
  const raw: J[] = data?.athletes ?? [];
  // Bazen pozisyona göre gruplu ({ position, items }) geliyor
  const flat = raw.flatMap((x) => (Array.isArray(x?.items) ? x.items : [x]));
  return flat.map((a) => player(a, a?.position));
}
