import type { Match } from "./types";

export type Result = "W" | "D" | "L";

export function resultFor(m: Match, teamId: string): Result | undefined {
  if (m.state !== "post" || m.home.score === undefined || m.away.score === undefined) return undefined;
  const home = m.home.team.id === teamId;
  const gf = home ? m.home.score : m.away.score;
  const ga = home ? m.away.score : m.home.score;
  return gf > ga ? "W" : gf < ga ? "L" : "D";
}

export interface SeasonStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  cleanSheets: number;
  failedToScore: number;
  home: { w: number; d: number; l: number };
  away: { w: number; d: number; l: number };
  bigWin?: Match;
  form: Result[]; // en yeniden eskiye, son 5
}

/** Takımın oynanmış maçlarından sezon özetini hesaplar */
export function seasonStats(past: Match[], teamId: string): SeasonStats {
  const s: SeasonStats = {
    played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, cleanSheets: 0, failedToScore: 0,
    home: { w: 0, d: 0, l: 0 }, away: { w: 0, d: 0, l: 0 }, form: [],
  };
  let best = 0;
  for (const m of past) {
    const r = resultFor(m, teamId);
    if (!r) continue;
    const home = m.home.team.id === teamId;
    const gf = (home ? m.home.score : m.away.score) ?? 0;
    const ga = (home ? m.away.score : m.home.score) ?? 0;
    s.played++; s.gf += gf; s.ga += ga;
    if (ga === 0) s.cleanSheets++;
    if (gf === 0) s.failedToScore++;
    const bucket = home ? s.home : s.away;
    if (r === "W") { s.won++; bucket.w++; } else if (r === "D") { s.drawn++; bucket.d++; } else { s.lost++; bucket.l++; }
    if (gf - ga > best) { best = gf - ga; s.bigWin = m; }
    if (s.form.length < 5) s.form.push(r);
  }
  return s;
}
