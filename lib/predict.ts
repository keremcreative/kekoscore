/** Skor tahmini puanlama: tam skor 3, doğru sonuç (1/X/2) 1 puan */
export const EXACT = 3;
export const OUTCOME = 1;

const sign = (h: number, a: number) => Math.sign(h - a);

export function points(pred: { home: number; away: number }, real: { home?: number; away?: number }): number | null {
  if (real.home === undefined || real.away === undefined) return null;
  if (pred.home === real.home && pred.away === real.away) return EXACT;
  return sign(pred.home, pred.away) === sign(real.home, real.away) ? OUTCOME : 0;
}

export interface LeaderRow {
  username: string;
  points: number;
  exact: number;
  outcome: number;
  played: number;
}

export interface SettledPick {
  username: string;
  home: number;
  away: number;
  points: number;
}

export interface SettledMatch {
  id: string;
  league: string;
  date: string;
  home: { name: string; logo?: string; score: number };
  away: { name: string; logo?: string; score: number };
  picks: SettledPick[];
}

export interface Leaderboard {
  rows: LeaderRow[];
  recent: SettledMatch[];
}
