import Link from "next/link";
import { getScoreboard } from "@/lib/data";
import { kickoff, ymd } from "@/lib/format";
import { LEAGUES } from "@/lib/leagues";
import type { Match } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

export function liveLabel(m: Match) {
  if (/^HT$|half/i.test(m.detail)) return "DA";
  return m.clock || "Canlı";
}

/** En üstteki kaydırılabilir bant: bugünün maçları (önce canlılar) */
export async function Ticker() {
  const day = ymd(new Date());
  const rs = await Promise.allSettled(LEAGUES.map((l) => getScoreboard(l.code, day)));
  const order = { in: 0, pre: 1, post: 2 } as const;
  const matches = rs
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .sort((a, b) => order[a.state] - order[b.state] || (a.state === "post" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))
    .slice(0, 30);
  if (!matches.length) return null;
  return (
    <div className="ticker" aria-label="Bugünün maçları">
      <span className="ticker-label">Bugün</span>
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
