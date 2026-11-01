/**
 * ESPN'in herkese açık (resmi olmayan, anahtarsız) futbol uç noktaları.
 * Yanıtları uygulamanın kendi tiplerine çeviriyoruz; ESPN şekli değiştirirse
 * yalnızca bu dosyayı düzeltmek yeterli.
 */
import type { EventKind, Match, MatchDetail, MatchEvent, MatchStat, Side, StandingRow, Team } from "./types";

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
    short: t?.shortDisplayName ?? t?.displayName ?? "?",
    abbr: t?.abbreviation ?? "",
    logo: t?.logo ?? t?.logos?.[0]?.href,
  };
}

function side(c: J): Side {
  const score = c?.score;
  const n = typeof score === "object" ? Number(score?.value) : Number(score);
  return { team: team(c?.team), score: Number.isFinite(n) ? n : undefined, winner: c?.winner === true };
}

function toMatch(ev: J, league: string): Match {
  const comp = ev?.competitions?.[0] ?? ev;
  const status = comp?.status ?? ev?.status ?? {};
  const st = status?.type ?? {};
  const state: Match["state"] = st.state === "in" ? "in" : st.state === "post" ? "post" : "pre";
  const cs: J[] = comp?.competitors ?? [];
  const home = cs.find((c) => c.homeAway === "home") ?? cs[0];
  const away = cs.find((c) => c.homeAway === "away") ?? cs[1];
  return {
    id: String(ev?.id ?? comp?.id),
    league,
    date: comp?.date ?? ev?.date,
    state,
    clock: state === "in" ? status?.displayClock : undefined,
    detail: st.shortDetail ?? st.detail ?? "",
    home: side(home),
    away: side(away),
  };
}

export async function scoreboard(league: string, yyyymmdd: string): Promise<Match[]> {
  const data = await get(`${SITE}/${league}/scoreboard?dates=${yyyymmdd}`, 20);
  return (data?.events ?? []).map((e: J) => toMatch(e, league));
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

export async function matchDetail(league: string, id: string): Promise<MatchDetail> {
  const data = await get(`${SITE}/${league}/summary?event=${id}`, 15);
  const comp = data?.header?.competitions?.[0];
  const base = toMatch({ id, competitions: [comp] }, league);
  const homeId = base.home.team.id;

  const events: MatchEvent[] = (data?.keyEvents ?? [])
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

  return { ...base, venue: data?.gameInfo?.venue?.fullName, events, stats };
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
