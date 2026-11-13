import { initTz } from "@/lib/tz";
import Link from "next/link";
import { Suspense } from "react";
import { MatchHighlights } from "@/components/MatchHighlights";
import { AutoRefresh } from "@/components/AutoRefresh";
import { MatchRow } from "@/components/MatchRow";
import { Poll } from "@/components/social/Poll";
import { PredictionCard } from "@/components/social/Predict";
import { Tabs } from "@/components/Tabs";
import { TeamLink } from "@/components/TeamLink";
import { TeamLogo } from "@/components/TeamLogo";
import { getCoach, getMatch } from "@/lib/data";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { Momentum } from "@/components/Momentum";
import { Commentary } from "@/components/Commentary";
import { kickoff, longDate } from "@/lib/format";
import { leagueByCode } from "@/lib/leagues";
import { RatingBadge } from "@/components/RatingBadge";
import type { Coach, EventKind, Lineup, LineupPlayer, MatchDetail } from "@/lib/types";

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

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string; id: string }>;
  searchParams: Promise<{ sekme?: string }>;
}) {
  await initTz();
  const { league: code, id } = await params;
  const tab = (await searchParams).sekme ?? "ozet";
  // Kupa maçları gibi listede olmayan turnuvalar da açılabilsin
  const league = leagueByCode(code) ?? { code, name: "Maç", flag: "⚽", country: "" };
  const known = !!leagueByCode(code);

  let m: MatchDetail;
  try {
    m = await getMatch(code, id);
  } catch {
    return <p className="notice error">Maç bilgisi yüklenemedi.</p>;
  }
  const live = m.state === "in";
  const center = m.state === "pre" ? kickoff(m.date) : `${m.home.score ?? 0} – ${m.away.score ?? 0}`;
  const status = live ? m.clock || "Canlı" : m.state === "post" ? "Maç sonu" : "Başlamadı";
  const tabs = [
    { key: "ozet", label: "Özet" },
    ...(m.plays.length ? [{ key: "anlatim", label: "Anlatım" }] : []),
    ...(m.lineups.length ? [{ key: "kadro", label: "Kadrolar" }] : []),
    ...(m.h2h.length ? [{ key: "h2h", label: "Aralarında" }] : []),
  ];
  const teamLeague = known ? code : "";
  // Teknik direktörler: kadro sekmesinde ve maç öncesi özette
  const coaches: (Coach | undefined)[] =
    tab === "kadro" || m.state === "pre"
      ? // Wikidata yavaş kalırsa sayfa teknik direktörsüz açılır (yanıt önbelleğe girer, sonraki açılışta görünür)
        await Promise.race([
          Promise.all([getCoach(code, m.home.team).catch(() => undefined), getCoach(code, m.away.team).catch(() => undefined)]),
          new Promise<(Coach | undefined)[]>((r) => setTimeout(() => r([]), 2500)),
        ])
      : [];

  return (
    <>
      <AutoRefresh active={live || (m.state === "pre" && new Date(m.date).getTime() - Date.now() < 3600e3)} seconds={20} />
      <Link href="/" className="back">‹ Maçlar</Link>
      <section className="card">
        <div className="hero">
          <div className="hero-meta">
            {known ? <Link href={`/lig/${code}`}>{league.flag} {league.name}</Link> : league.name} · {longDate(m.date)}
            {m.venue ? ` · ${m.venue}` : ""}
          </div>
          <div className="hero-grid">
            <HeroTeam m={m} side="home" league={teamLeague} />
            <div>
              <div className="hero-score">{center}</div>
              <div className={`hero-status${live ? " live" : ""}`}>{status}</div>
            </div>
            <HeroTeam m={m} side="away" league={teamLeague} />
          </div>
        </div>
      </section>

      {tabs.length > 1 && <Tabs items={tabs} current={tab} base={`/mac/${code}/${id}`} />}

      {tab === "ozet" && (
        <>
          {m.state === "post" && (
            <Suspense fallback={null}>
              <MatchHighlights league={code} m={m} />
            </Suspense>
          )}
          <BestPlayer m={m} />
          {(m.momentum.length > 0 || (live && m.plays.length > 0)) && (
            <section className="card">
              <div className="section-title">{live ? "Maçın gidişatı · canlı" : "Maçın gidişatı"}</div>
              <Momentum points={m.momentum} plays={m.plays} home={m.home.team.short} away={m.away.team.short} />
              {live && (
                <>
                  <Commentary plays={m.plays} home={m.home.team.short} away={m.away.team.short} limit={4} />
                  <Link href={`/mac/${code}/${id}?sekme=anlatim`} className="card-link">Tüm anlatım ›</Link>
                </>
              )}
            </section>
          )}
          <PredictionCard league={code} matchId={m.id} state={m.state} home={m.home.team} away={m.away.team} score={{ home: m.home.score, away: m.away.score }} />
          <Poll matchId={`${code}:${m.id}`} state={m.state} home={m.home.team} away={m.away.team} />
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

          {m.state === "pre" && (coaches[0] || coaches[1]) && (
            <section className="card">
              <div className="section-title">Teknik direktörler</div>
              <Coaches coaches={coaches} />
            </section>
          )}
          {m.state === "pre" && <p className="empty">Maç başladığında olaylar ve istatistikler burada görünecek.</p>}
        </>
      )}

      {tab === "kadro" && <Lineups m={m} coaches={coaches} />}

      {tab === "anlatim" && (
        <>
          {m.momentum.length > 0 && (
            <section className="card">
              <Momentum points={m.momentum} plays={m.plays} home={m.home.team.short} away={m.away.team.short} />
            </section>
          )}
          <section className="card">
            <Commentary plays={m.plays} home={m.home.team.short} away={m.away.team.short} />
          </section>
        </>
      )}

      {tab === "h2h" && (
        <section className="card">
          <div className="section-title">Son karşılaşmalar</div>
          <H2HSummary m={m} />
          {m.h2h.map((x) => (
            <MatchRow key={x.id} m={x} showDate />
          ))}
        </section>
      )}
    </>
  );
}

function HeroTeam({ m, side, league }: { m: MatchDetail; side: "home" | "away"; league: string }) {
  const t = m[side].team;
  const body = (
    <>
      <TeamLogo team={t} size={52} />
      {t.name}
    </>
  );
  return league ? (
    <TeamLink team={t} league={league} className="hero-team">
      {body}
    </TeamLink>
  ) : (
    <div className="hero-team">{body}</div>
  );
}

function PlayerLine({ p, league }: { p: LineupPlayer; league: string }) {
  const body = (
    <>
      <PlayerPhoto src={p.photo} name={p.name} size={24} />
      <span className="num">{p.number ?? ""}</span>
      <span className="pname">{shortName(p.name)}</span>
      {p.subbedOut && <span className="sub-out" title="Oyundan çıktı">↓</span>}
      {p.subbedIn && <span className="sub-in" title="Oyuna girdi">↑</span>}
      <RatingBadge r={p.rating} />
    </>
  );
  return p.id ? (
    <Link className="lp" href={`/oyuncu/${league}/${p.id}`}>{body}</Link>
  ) : (
    <div className="lp">{body}</div>
  );
}

/** Dar sütunda uzun adlar: "Victor Osimhen" → "V. Osimhen" */
const shortName = (n: string) => {
  const w = n.split(/\s+/);
  return n.length > 11 && w.length > 1 ? `${w[0][0]}. ${w.slice(1).join(" ")}` : n;
};

const ORDER = { G: 0, D: 1, M: 2, F: 3, "?": 4 } as const;

function Coaches({ coaches }: { coaches: (Coach | undefined)[] }) {
  return (
    <div className="lineup-coach">
      {coaches.slice(0, 2).map((c, i) => (
        <div key={i}>
          {c ? (
            <>
              <PlayerPhoto src={c.photo} name={c.name} size={32} />
              <span>
                <small>TD</small>
                {c.name}
              </span>
            </>
          ) : (
            <span />
          )}
        </div>
      ))}
    </div>
  );
}

function Lineups({ m, coaches }: { m: MatchDetail; coaches: (Coach | undefined)[] }) {
  const get = (side: "home" | "away"): Lineup | undefined => m.lineups.find((l) => l.side === side);
  const sides = [get("home"), get("away")];
  const starters = (l?: Lineup) => (l?.players ?? []).filter((p) => p.starter).sort((a, b) => ORDER[a.pos] - ORDER[b.pos]);
  const bench = (l?: Lineup) => (l?.players ?? []).filter((p) => !p.starter);
  return (
    <>
      <BestPlayer m={m} />
      <section className="card">
        <div className="lineup-head">
          <span>{m.home.team.short} {sides[0]?.formation && <small>{sides[0].formation}</small>}</span>
          <span>{sides[1]?.formation && <small>{sides[1].formation}</small>} {m.away.team.short}</span>
        </div>
        <div className="section-title">İlk 11</div>
        <div className="lineup">
          {sides.map((l, i) => (
            <div key={i}>{starters(l).map((p) => <PlayerLine key={p.id + p.name} p={p} league={m.league} />)}</div>
          ))}
        </div>
        {(bench(sides[0]).length > 0 || bench(sides[1]).length > 0) && (
          <>
            <div className="section-title">Yedekler</div>
            <div className="lineup">
              {sides.map((l, i) => (
                <div key={i}>{bench(l).map((p) => <PlayerLine key={p.id + p.name} p={p} league={m.league} />)}</div>
              ))}
            </div>
          </>
        )}
        {(coaches[0] || coaches[1]) && (
          <>
            <div className="section-title">Teknik direktörler</div>
            <Coaches coaches={coaches} />
          </>
        )}
      </section>
    </>
  );
}

/** Maçın en yüksek reytingli oyuncusu */
function BestPlayer({ m }: { m: MatchDetail }) {
  const all = m.lineups.flatMap((l) => l.players.map((p) => ({ p, side: l.side })));
  const best = all.filter((x) => x.p.rating !== undefined).sort((a, b) => b.p.rating! - a.p.rating!)[0];
  if (!best) return null;
  const team = best.side === "home" ? m.home.team : m.away.team;
  return (
    <Link href={`/oyuncu/${m.league}/${best.p.id}`} className="card best-player">
      <PlayerPhoto src={best.p.photo} name={best.p.name} size={44} />
      <span className="best-txt">
        <small>{m.state === "in" ? "Şu an maçın en iyisi" : "Maçın oyuncusu"}</small>
        <b>{best.p.name}</b>
        <span>{team.name}</span>
      </span>
      <RatingBadge r={best.p.rating} big />
    </Link>
  );
}

function H2HSummary({ m }: { m: MatchDetail }) {
  let h = 0, d = 0, a = 0;
  for (const x of m.h2h) {
    const homeIsOurHome = x.home.team.id === m.home.team.id;
    if (x.home.winner) homeIsOurHome ? h++ : a++;
    else if (x.away.winner) homeIsOurHome ? a++ : h++;
    else d++;
  }
  return (
    <div className="h2h">
      <div><b>{h}</b><small>{m.home.team.short}</small></div>
      <div><b>{d}</b><small>Beraberlik</small></div>
      <div><b>{a}</b><small>{m.away.team.short}</small></div>
    </div>
  );
}
