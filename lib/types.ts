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
  lineups: Lineup[];
  /** İki takımın birbirleriyle oynadığı son maçlar */
  h2h: Match[];
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

export interface TeamInfo {
  team: Team;
  venue?: string;
  standingSummary?: string;
}

export type PositionGroup = "G" | "D" | "M" | "F" | "?";

export interface Player {
  id: string;
  name: string;
  number?: string;
  pos: PositionGroup;
  posLabel?: string;
  age?: number;
  nationality?: string;
}

export interface LineupPlayer extends Player {
  starter: boolean;
  subbedIn?: boolean;
  subbedOut?: boolean;
}

export interface Lineup {
  side: "home" | "away";
  formation?: string;
  players: LineupPlayer[];
}

export interface TeamSchedule {
  past: Match[];
  upcoming: Match[];
}

export interface LeagueLogo {
  light?: string;
  dark?: string;
}
