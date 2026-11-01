import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { TeamLogo } from "@/components/TeamLogo";
import { getMatch } from "@/lib/data";
import { kickoff, longDate } from "@/lib/format";
import { leagueByCode } from "@/lib/leagues";
import type { EventKind, MatchDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

function Icon({ kind }: { kind: EventKind }) {
  switch (kind) {
    case "goal":
      return <span className="ev-icon">⚽</span>;
    case "penalty":
      return <span className="ev-icon" title="Penaltı">⚽︎P</span>;
    case "own-goal":
      return <span className="ev-icon" title="Kendi kalesine">⚽︎K</span>;
    case "yellow":
      return <span className="ev-icon"><span className="card-y" /></span>;
    case "red":
      return <span className="ev-icon"><span className="card-r" /></span>;
    case "sub":
      return <span className="ev-icon">⇄</span>;
    default:
      return null;
  }
}

const num = (s: string) => parseFloat(s.replace("%", "")) || 0;

export default async function MatchPage({ params }: { params: Promise<{ league: string; id: string }> }) {
  const { league: code, id } = await params;
  const league = leagueByCode(code);
  if (!league) notFound();

  let m: MatchDetail;
  try {
    m = await getMatch(code, id);
  } catch {
    return <p className="notice error">Maç bilgisi yüklenemedi.</p>;
  }
  const live = m.state === "in";
  const center = m.state === "pre" ? kickoff(m.date) : `${m.home.score ?? 0} – ${m.away.score ?? 0}`;
  const status = live ? m.clock || "Canlı" : m.state === "post" ? "Maç sonu" : "Başlamadı";

  return (
    <>
      <AutoRefresh active={live} seconds={20} />
      <Link href="/" className="back">‹ Maçlar</Link>
      <section className="card">
        <div className="hero">
          <div className="hero-meta">
            <Link href={`/lig/${code}`}>{league.flag} {league.name}</Link> · {longDate(m.date)}
            {m.venue ? ` · ${m.venue}` : ""}
          </div>
          <div className="hero-grid">
            <div className="hero-team">
              <TeamLogo team={m.home.team} size={52} />
              {m.home.team.name}
            </div>
            <div>
              <div className="hero-score">{center}</div>
              <div className={`hero-status${live ? " live" : ""}`}>{status}</div>
            </div>
            <div className="hero-team">
              <TeamLogo team={m.away.team} size={52} />
              {m.away.team.name}
            </div>
          </div>
        </div>
      </section>

      {m.events.length > 0 && (
        <section className="card">
          <div className="section-title">Olaylar</div>
          <ul className="events">
            {m.events.map((e, i) => (
              <li className="event" key={i}>
                <span className="home">{e.side === "home" && <>{e.text} <Icon kind={e.kind} /></>}</span>
                <span className="min">{e.minute}</span>
                <span>{e.side === "away" && <><Icon kind={e.kind} /> {e.text}</>}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {m.stats.length > 0 && (
        <section className="card">
          <div className="section-title">İstatistikler</div>
          {m.stats.map((s) => {
            const h = num(s.home), a = num(s.away), t = h + a || 1;
            return (
              <div className="stat" key={s.label}>
                <div className="stat-row">
                  <span>{s.home}</span>
                  <span>{s.label}</span>
                  <span>{s.away}</span>
                </div>
                <div className="bars">
                  <div className="h" style={{ flex: h / t || 0.0001 }} />
                  <div className="a" style={{ flex: a / t || 0.0001 }} />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {m.state === "pre" && <p className="empty">Maç başladığında olaylar ve istatistikler burada görünecek.</p>}
    </>
  );
}
