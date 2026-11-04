import Link from "next/link";
import type { League } from "@/lib/leagues";
import type { LeagueLogo, Match } from "@/lib/types";
import { kickoff } from "@/lib/format";
import { LeagueIcon } from "./LeagueIcon";
import { TeamLogo } from "./TeamLogo";
import { Momentum } from "./Momentum";
import type { MomentumPoint } from "@/lib/momentum";

export interface Featured {
  match: Match;
  league: League;
  /** Canlı maçlarda küçük momentum grafiği */
  momentum?: MomentumPoint[];
}

/** Ana sayfanın en üstündeki büyük kart(lar): canlı maçlar, yoksa günün sıradaki maçları */
export function LiveHero({ items, logos }: { items: Featured[]; logos: Record<string, LeagueLogo> }) {
  if (!items.length) return null;
  return (
    <div className={`hero-rail${items.length > 1 ? " multi" : ""}`}>
      {items.map(({ match: m, league, momentum }) => {
        const live = m.state === "in";
        return (
          <Link key={m.id} href={`/mac/${m.league}/${m.id}`} className={`hero-card${live ? " live" : ""}`}>
            <div className="hc-top">
              <LeagueIcon league={league} logo={logos[league.code]} size={22} />
              <span>{league.name}</span>
              <span className={`hc-badge${live ? " on" : ""}`}>{live ? "CANLI" : m.state === "post" ? "BİTTİ" : "SIRADAKİ"}</span>
            </div>
            <div className="hc-grid">
              <div className="hc-team">
                <TeamLogo team={m.home.team} size={64} />
                <span>{m.home.team.short}</span>
              </div>
              <div className="hc-mid">
                {m.state === "pre" ? (
                  <b className="hc-time">{kickoff(m.date)}</b>
                ) : (
                  <b className="hc-score">
                    {m.home.score ?? 0} - {m.away.score ?? 0}
                  </b>
                )}
                <span className="hc-clock">{live ? m.clock || "Canlı" : m.state === "post" ? "Maç sonu" : "Bugün"}</span>
              </div>
              <div className="hc-team">
                <TeamLogo team={m.away.team} size={64} />
                <span>{m.away.team.short}</span>
              </div>
            </div>
            {live && momentum && <Momentum points={momentum} compact />}
          </Link>
        );
      })}
    </div>
  );
}
