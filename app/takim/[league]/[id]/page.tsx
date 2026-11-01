import Link from "next/link";
import { notFound } from "next/navigation";
import { Form } from "@/components/Form";
import { MatchRow } from "@/components/MatchRow";
import { StandingsTable } from "@/components/StandingsTable";
import { Tabs } from "@/components/Tabs";
import { TeamLogo } from "@/components/TeamLogo";
import { getRoster, getStandings, getTeamInfo, getTeamSchedule } from "@/lib/data";
import { kickoff, longDate } from "@/lib/format";
import { leagueByCode } from "@/lib/leagues";
import { seasonStats } from "@/lib/teamStats";
import type { Player, PositionGroup, StandingRow, Team } from "@/lib/types";

export const revalidate = 120;

const TABS = [
  { key: "maclar", label: "Maçlar" },
  { key: "istatistik", label: "İstatistik" },
  { key: "kadro", label: "Kadro" },
];

const GROUPS: { pos: PositionGroup; label: string }[] = [
  { pos: "G", label: "Kaleciler" },
  { pos: "D", label: "Defans" },
  { pos: "M", label: "Orta saha" },
  { pos: "F", label: "Forvet" },
  { pos: "?", label: "Diğer" },
];

const settled = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : undefined);

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string; id: string }>;
  searchParams: Promise<{ sekme?: string }>;
}) {
  const { league: code, id } = await params;
  const tab = (await searchParams).sekme ?? "maclar";
  const league = leagueByCode(code);
  if (!league) notFound();

  const [infoR, schedR, tableR, rosterR] = await Promise.allSettled([
    getTeamInfo(code, id),
    getTeamSchedule(code, id),
    getStandings(code),
    tab === "kadro" ? getRoster(code, id) : Promise.resolve([] as Player[]),
  ]);
  const info = settled(infoR);
  const sched = settled(schedR) ?? { past: [], upcoming: [] };
  const table = settled(tableR) ?? [];
  const row = table.find((r) => r.team.id === id);
  const fromMatches = [...sched.past, ...sched.upcoming]
    .flatMap((m) => [m.home.team, m.away.team])
    .find((t) => t.id === id);
  const team: Team | undefined = info?.team ?? row?.team ?? fromMatches;
  if (!team) return <p className="notice error">Takım bilgisi yüklenemedi.</p>;

  // İstatistikler yalnızca bu ligin maçlarından
  const leaguePast = sched.past.filter((m) => m.league === code);
  const stats = seasonStats(leaguePast.length ? leaguePast : sched.past, id);
  const next = sched.upcoming[0];
  const base = `/takim/${code}/${id}`;

  return (
    <>
      <Link href={`/lig/${code}`} className="back">‹ {league.name}</Link>
      <section className="card team-hero">
        <TeamLogo team={team} size={64} />
        <div>
          <h1>{team.name}</h1>
          <div className="team-meta">
            {league.flag} {league.name}
            {row && <> · {row.rank}. sıra · {row.points} puan</>}
          </div>
          {stats.form.length > 0 && <Form results={stats.form} />}
        </div>
      </section>

      <Tabs items={TABS} current={tab} base={base} />

      {tab === "maclar" && (
        <>
          {schedR.status === "rejected" && <p className="notice error">Fikstür yüklenemedi.</p>}
          {next && (
            <section className="card">
              <div className="section-title">Sıradaki maç · {longDate(next.date)}</div>
              <Link href={`/mac/${next.league}/${next.id}`} className="next-match">
                <span><TeamLogo team={next.home.team} size={36} />{next.home.team.short}</span>
                <b>{kickoff(next.date)}</b>
                <span><TeamLogo team={next.away.team} size={36} />{next.away.team.short}</span>
              </Link>
            </section>
          )}
          {sched.upcoming.length > 1 && (
            <section className="card">
              <div className="section-title">Fikstür</div>
              {sched.upcoming.slice(1, 8).map((m) => (
                <MatchRow key={m.id} m={m} teamId={id} showDate />
              ))}
            </section>
          )}
          {sched.past.length > 0 && (
            <section className="card">
              <div className="section-title">Son maçlar</div>
              {sched.past.map((m) => (
                <MatchRow key={m.id} m={m} teamId={id} showDate />
              ))}
            </section>
          )}
          {!next && sched.past.length === 0 && schedR.status === "fulfilled" && <p className="empty">Maç bulunamadı.</p>}
        </>
      )}

      {tab === "istatistik" && (
        <>
          {stats.played === 0 ? (
            <p className="empty">Bu sezon henüz maç oynanmadı.</p>
          ) : (
            <section className="card">
              <div className="section-title">Sezon · {stats.played} maç</div>
              <div className="stat-grid">
                <Tile label="Galibiyet" value={stats.won} />
                <Tile label="Beraberlik" value={stats.drawn} />
                <Tile label="Mağlubiyet" value={stats.lost} />
                <Tile label="Atılan gol" value={stats.gf} />
                <Tile label="Yenilen gol" value={stats.ga} />
                <Tile label="Averaj" value={(stats.gf - stats.ga > 0 ? "+" : "") + (stats.gf - stats.ga)} />
                <Tile label="Maç başı gol" value={(stats.gf / stats.played).toFixed(1)} />
                <Tile label="Gol yemeden" value={stats.cleanSheets} />
                <Tile label="Gol atamadan" value={stats.failedToScore} />
              </div>
              <div className="split">
                <div>
                  <small>İç saha</small>
                  <b>{stats.home.w}G {stats.home.d}B {stats.home.l}M</b>
                </div>
                <div>
                  <small>Deplasman</small>
                  <b>{stats.away.w}G {stats.away.d}B {stats.away.l}M</b>
                </div>
              </div>
              {stats.bigWin && (
                <>
                  <div className="section-title">En farklı galibiyet</div>
                  <MatchRow m={stats.bigWin} teamId={id} showDate />
                </>
              )}
            </section>
          )}
          {row && (
            <section className="card">
              <div className="section-title">Puan durumunda</div>
              <StandingsTable rows={around(table, row)} league={code} highlight={id} />
              <Link href={`/lig/${code}`} className="card-link">Tüm puan durumu ›</Link>
            </section>
          )}
        </>
      )}

      {tab === "kadro" && (
        <>
          {rosterR.status === "rejected" && <p className="notice error">Kadro yüklenemedi.</p>}
          {GROUPS.map(({ pos, label }) => {
            const ps = (settled(rosterR) ?? []).filter((p) => p.pos === pos);
            if (!ps.length) return null;
            return (
              <section className="card" key={pos}>
                <div className="section-title">{label}</div>
                {ps.map((p) => (
                  <div className="player" key={p.id || p.name}>
                    <span className="num">{p.number ?? ""}</span>
                    <span className="pname">
                      {p.name}
                      {p.nationality && <small>{p.nationality}</small>}
                    </span>
                    {p.age !== undefined && <span className="age">{p.age} yaş</span>}
                  </div>
                ))}
              </section>
            );
          })}
        </>
      )}
    </>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="tile">
      <b>{value}</b>
      <small>{label}</small>
    </div>
  );
}

function around(rows: StandingRow[], row: StandingRow) {
  const i = rows.indexOf(row);
  const start = Math.max(0, Math.min(i - 2, rows.length - 5));
  return rows.slice(start, start + 5);
}
