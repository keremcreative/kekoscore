/**
 * Oyuncu reytingi (3.0–10.0). ESPN reyting vermiyor; maç kadrosundaki oyuncu istatistiklerinden
 * (gol, asist, şut, kurtarış, kart, yenen gol…) kendi puanımızı hesaplıyoruz. 6.0'dan başlar.
 */
import type { LineupPlayer, PositionGroup } from "./types";

type S = Record<string, number>;

export function rate(p: { pos: PositionGroup; starter: boolean; subbedIn?: boolean; stats?: S }, result: "W" | "D" | "L"): number | undefined {
  const s = p.stats;
  if (!s || !(p.starter || p.subbedIn)) return undefined;
  const v = (k: string) => s[k] ?? 0;
  const goals = v("totalGoals");
  const onTarget = Math.max(0, v("shotsOnTarget") - goals);
  const offTarget = Math.max(0, v("totalShots") - v("shotsOnTarget"));
  const conceded = v("goalsConceded");
  const keeper = p.pos === "G";
  const def = p.pos === "D";

  let r = 6.0;
  r += goals * (keeper || def ? 1.3 : 1.0);
  r += v("goalAssists") * 0.75;
  r += onTarget * 0.2 + offTarget * 0.05;
  r += v("foulsSuffered") * 0.08 - v("foulsCommitted") * 0.1 - v("offsides") * 0.08;
  r -= v("yellowCards") * 0.35 + v("redCards") * 1.5 + v("ownGoals") * 1.0;
  if (keeper) r += v("saves") * 0.3 - conceded * 0.35 + (conceded === 0 && p.starter ? 0.7 : 0);
  else if (def) r += -conceded * 0.15 + (conceded === 0 && p.starter ? 0.5 : 0);
  r += result === "W" ? 0.3 : result === "L" ? -0.2 : 0;
  if (!p.starter) r = 6 + (r - 6) * 0.85; // az süre oynayan uçlara gitmesin
  return Math.round(Math.max(3, Math.min(10, r)) * 10) / 10;
}

/** Reytinge göre renk: kırmızı → turuncu → sarı → yeşil → koyu yeşil */
export function ratingClass(r: number): string {
  if (r < 6) return "r1";
  if (r < 6.5) return "r2";
  if (r < 7) return "r3";
  if (r < 7.5) return "r4";
  if (r < 8) return "r5";
  return "r6";
}

/** Kadrolara reyting ekle (maç başladıysa) */
export function rateLineups<T extends { side: "home" | "away"; players: LineupPlayer[] }>(lineups: T[], homeScore = 0, awayScore = 0): T[] {
  for (const l of lineups) {
    const mine = l.side === "home" ? homeScore : awayScore;
    const theirs = l.side === "home" ? awayScore : homeScore;
    const res = mine > theirs ? "W" : mine < theirs ? "L" : "D";
    for (const p of l.players) p.rating = rate(p, res);
  }
  return lineups;
}
