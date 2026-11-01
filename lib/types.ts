export type MatchState = "pre" | "in" | "post";

export interface Team {
  id: string;
  name: string;
  short: string;
  abbr: string;
  logo?: string;
}

export interface Side {
  team: Team;
  score?: number;
  winner?: boolean;
}

export interface Match {
  id: string;
  league: string;
  date: string; // ISO
  state: MatchState;
  clock?: string; // "67'"
  detail: string; // "FT", "HT", "20:00"
  home: Side;
  away: Side;
}

export type EventKind = "goal" | "own-goal" | "penalty" | "yellow" | "red" | "sub" | "other";

export interface MatchEvent {
  minute: string;
  kind: EventKind;
  side: "home" | "away";
  text: string;
}

export interface MatchStat {
  label: string;
  home: string;
  away: string;
}

export interface MatchDetail extends Match {
  venue?: string;
  events: MatchEvent[];
  stats: MatchStat[];
}

export interface StandingRow {
  rank: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gd: number;
  points: number;
  note?: string;
}
