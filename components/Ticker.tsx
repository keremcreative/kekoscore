import Link from "next/link";
import { getScoreboard } from "@/lib/data";
import { kickoff, shiftDays, ymd } from "@/lib/format";
import { LEAGUES } from "@/lib/leagues";
import type { Match } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

export function liveLabel(m: Match) {
  if (/^HT$|half/i.test(m.detail)) return "DA";
  return m.clock || "Canlı";
}

/**
 * En üstteki kaydırılabilir bant: önce canlılar, sonra son 24 saatte biten
 * maçların sonuçları (en yenisi önde), sonra bugünün sıradaki maçları.
 */
export async function Ticker() {
  const now = new Date();
  const days = [ymd(shiftDays(now, -1)), ymd(now)];
  const rs = await Promise.allSettled(LEAGUES.flatMap((l) => days.map((d) => getScoreboard(l.code, d))));
  const seen = new Set<string>();
  const all = rs.flatMap((r) => (r.status === "fulfilled" ? r.value : [])).filter((m) => !seen.has(m.id) && seen.add(m.id));
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
    <div className="ticker" aria-label="Bugünün maçları">
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
    </div>
  );
}
