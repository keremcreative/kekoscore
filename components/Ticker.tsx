import Link from "next/link";
import { memo } from "@/lib/memo";
import { LIVE_TTL, getScoreboardRange } from "@/lib/data";
import { kickoff, shiftDays, ymd } from "@/lib/format";
import { MAIN_LEAGUES } from "@/lib/leagues";
import type { Match } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";
import { Marquee } from "./Marquee";

export function liveLabel(m: Match) {
  if (/^HT$|half/i.test(m.detail)) return "DA";
  return m.clock || "Canlı";
}

/**
 * En üstteki kaydırılabilir bant: önce canlılar, sonra son 24 saatte biten
 * maçların sonuçları (en yenisi önde), sonra bugünün sıradaki maçları.
 */
/**
 * Bandın maçları sunucu belleğinde 15 sn (Vercel önbelleğine yazılmaz; eski skor gösterilmez).
 * Lig başına istekler de önbelleğe yazılmaz (0). Dün+bugün tek istekte.
 */
const tickerMatches = (yesterday: string, today: string): Promise<Match[]> =>
  memo(`bant:${yesterday}:${today}`, LIVE_TTL, async () => {
    const rs = await Promise.allSettled(MAIN_LEAGUES.map((l) => getScoreboardRange(l.code, yesterday, today, 0)));
    if (rs.every((r) => r.status === "rejected")) throw new Error("ESPN'den bant alınamadı");
    const seen = new Set<string>();
    return rs.flatMap((r) => (r.status === "fulfilled" ? r.value : [])).filter((m) => !seen.has(m.id) && seen.add(m.id));
  });

export async function Ticker() {
  const now = new Date();
  const days = [ymd(shiftDays(now, -1)), ymd(now)];
  const all = await tickerMatches(days[0], days[1]).catch(() => [] as Match[]);
  const t = now.getTime();
  const live = all.filter((m) => m.state === "in");
  const done = all
    .filter((m) => m.state === "post" && t - new Date(m.date).getTime() < 26 * 3600e3)
    .sort((a, b) => b.date.localeCompare(a.date));
  const next = all
    .filter((m) => m.state === "pre" && ymd(new Date(m.date)) === days[1])
    .sort((a, b) => a.date.localeCompare(b.date));
  const matches = [...live, ...done, ...next].slice(0, 40);
  if (!matches.length) return null;
  return (
    <Marquee label="Maç bandı">
      {matches.map((m) => {
        const live = m.state === "in";
        return (
          <Link key={m.id} href={`/mac/${m.league}/${m.id}`} className={`chip${live ? " live" : ""}`}>
            <span className="chip-st">{live ? liveLabel(m) : m.state === "post" ? "MS" : kickoff(m.date)}</span>
            <TeamLogo team={m.home.team} size={20} />
            <span className="chip-sc">{m.state === "pre" ? "-" : `${m.home.score ?? 0}-${m.away.score ?? 0}`}</span>
            <TeamLogo team={m.away.team} size={20} />
          </Link>
        );
      })}
    </Marquee>
  );
}
