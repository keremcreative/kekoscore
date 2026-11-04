import { unstable_cache } from "next/cache";
import { getStandings } from "./data";
import { LEAGUES } from "./leagues";
import type { Team } from "./types";

/** Aramada Türkçe karakter ve büyük/küçük harf farkı olmasın: "fenerbahce" = "Fenerbahçe" */
export const fold = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export interface TeamHit {
  team: Team;
  league: string;
}

/** Arama için takım listesi: ana ve önemli liglerin puan tablolarından, saatte bir yenilenir */
export const teamIndex = unstable_cache(
  async (): Promise<TeamHit[]> => {
    const leagues = LEAGUES.filter((l) => (l.tier ?? 3) <= 2 && l.group !== "Kupalar" && l.group !== "Milli takımlar");
    const tables = await Promise.all(leagues.map((l) => getStandings(l.code).catch(() => [])));
    const seen = new Set<string>();
    const out: TeamHit[] = [];
    tables.forEach((rows, i) => {
      for (const r of rows) {
        if (seen.has(r.team.id)) continue;
        seen.add(r.team.id);
        out.push({ team: r.team, league: leagues[i].code });
      }
    });
    return out;
  },
  ["arama-takimlar-v1", process.env.DATA_SOURCE ?? "espn"],
  { revalidate: 3600 },
);

/** Sorgunun her kelimesi metinde bir kelimenin başında geçmeli ("real mad" → Real Madrid) */
export function matches(q: string, ...texts: (string | undefined)[]): boolean {
  const words = fold(q).split(" ").filter(Boolean);
  if (!words.length) return false;
  const hay = " " + texts.filter(Boolean).map((t) => fold(t!)).join(" ");
  return words.every((w) => hay.includes(" " + w));
}
