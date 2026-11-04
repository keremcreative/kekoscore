import type { Match, Team } from "./types";

/**
 * Bildirim gönderilecek büyük kulüpler. ESPN takım adları farklı yazılabildiği için
 * (Fenerbahce / Fenerbahçe, Bayern Munich / Bayern München) adlar sadeleştirilip
 * karşılaştırılır. Listeye ekle/çıkar: yalnızca ad yazmak yeterli.
 */
export const BIG_TR = ["Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor", "Türkiye", "Turkey"];

export const BIG_EU = [
  // İngiltere
  "Manchester City", "Manchester United", "Liverpool", "Arsenal", "Chelsea", "Tottenham Hotspur", "Tottenham",
  // İspanya
  "Real Madrid", "Barcelona", "Atlético Madrid", "Atletico Madrid",
  // İtalya
  "Juventus", "Internazionale", "Inter Milan", "Inter", "AC Milan", "Milan", "Napoli",
  // Almanya
  "Bayern Munich", "Bayern München", "Borussia Dortmund", "Bayer Leverkusen",
  // Fransa
  "Paris Saint-Germain", "PSG",
];

const norm = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const TR = new Set(BIG_TR.map(norm));
const EU = new Set(BIG_EU.map(norm));

export type BigKind = "tr" | "eu";

/** Takım büyük kulüp mü? Kadın ve gençlik takımları hariç. */
export function bigKind(t: Team): BigKind | undefined {
  for (const name of [t.name, t.short]) {
    if (!name || /\b(women|kadın|u\d{2}|ii|b)\b/i.test(name)) continue;
    const n = norm(name);
    if (TR.has(n)) return "tr";
    if (EU.has(n)) return "eu";
  }
  return undefined;
}

/** Maçta büyük kulüp varsa türü (Türk büyüğü öncelikli) */
export function matchBigKind(m: Match): BigKind | undefined {
  const a = bigKind(m.home.team), b = bigKind(m.away.team);
  return a === "tr" || b === "tr" ? "tr" : a ?? b;
}
