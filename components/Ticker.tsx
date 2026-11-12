import Link from "next/link";
import { getAllLeagueDays } from "@/lib/data";
import { kickoff, shiftDays, ymd } from "@/lib/format";
import { LEAGUES } from "@/lib/leagues";
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
 * Bant, ana sayfanın dün+bugün listesini kullanır (aynı 15 sn'lik bellek kaydı): ESPN'e ayrıca istek gitmez.
 */
const tickerMatches = async (yesterday: string, today: string): Promise<Match[]> => {
  const rs = await getAllLeagueDays(yesterday, today);
  const seen = new Set<string>();
  return LEAGUES.flatMap((l, i) => (l.tier === 1 ? (rs[i] ?? []) : [])).filter((m) => !seen.has(m.id) && !!seen.add(m.id));
};

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
