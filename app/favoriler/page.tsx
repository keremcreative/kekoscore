import Link from "next/link";
import { LeagueIcon } from "@/components/LeagueIcon";
import { MatchRow } from "@/components/MatchRow";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { StandingsTable } from "@/components/StandingsTable";
import { TeamLogo } from "@/components/TeamLogo";
import { FavSync } from "@/components/social/FavSync";
import { getLeagueLogosCached, getPlayer, getStandings, getTeamInfo, getTeamSchedule } from "@/lib/data";
import { serverFavs } from "@/lib/favsServer";
import { favKey } from "@/lib/favs";
import { leagueByCode } from "@/lib/leagues";
import { initTz } from "@/lib/tz";

export const dynamic = "force-dynamic";
export const metadata = { title: "Favoriler · kekoscore" };

const split = (ref: string) => {
  const i = ref.lastIndexOf("/");
  return [ref.slice(0, i), ref.slice(i + 1)] as const;
};

export default async function FavoritesPage() {
  await initTz();
  const favs = await serverFavs();
  const teams = favs.filter((f) => f.kind === "team").map((f) => split(f.ref));
  const players = favs.filter((f) => f.kind === "player").map((f) => split(f.ref));
  const leagues = favs.filter((f) => f.kind === "league" && leagueByCode(f.ref)).map((f) => f.ref);

  const [teamData, playerData, leagueData, logos] = await Promise.all([
    Promise.all(teams.map(async ([lg, id]) => {
      const [info, sched] = await Promise.allSettled([getTeamInfo(lg, id), getTeamSchedule(lg, id)]);
      return { lg, id, info: info.status === "fulfilled" ? info.value : null, sched: sched.status === "fulfilled" ? sched.value : null };
    })),
    Promise.all(players.map(([lg, id]) => getPlayer(lg, id).catch(() => null))),
    Promise.all(leagues.map((code) => getStandings(code).catch(() => []))),
    leagues.length ? getLeagueLogosCached() : Promise.resolve({} as Awaited<ReturnType<typeof getLeagueLogosCached>>),
  ]);

  return (
    <>
      <FavSync keys={favs.map(favKey)} />
      <h1 className="page-title">Favoriler</h1>
      {!favs.length && (
        <div className="card empty">
          Henüz favorin yok. Bir takımın, oyuncunun ya da ligin sayfasındaki <b>☆</b> yıldıza dokununca burada görünür.
          <br />
          <Link href="/lig" className="btn" style={{ marginTop: 14 }}>Liglere göz at</Link>
        </div>
      )}

      {teamData.map(({ lg, id, info, sched }) => {
        if (!info) return null;
        const last = sched?.past[0];
        const next = sched?.upcoming[0];
        return (
          <section className="card" key={`t${lg}${id}`}>
            <Link href={`/takim/${lg}/${id}`} className="card-head">
              <TeamLogo team={info.team} size={22} /> {info.team.name}
              <span className="more">Takım ›</span>
            </Link>
            {next && <MatchRow m={next} teamId={id} showDate />}
            {last && <MatchRow m={last} teamId={id} showDate />}
            {!next && !last && <div className="empty">Maç bilgisi yok.</div>}
          </section>
        );
      })}

      {playerData.some(Boolean) && (
        <section className="card">
          <div className="section-title">Oyuncular</div>
          {playerData.map((p) =>
            p ? (
              <Link key={`p${p.league}${p.id}`} href={`/oyuncu/${p.league}/${p.id}`} className="player">
                <PlayerPhoto src={p.photo} name={p.name} size={36} />
                <span className="pname">
                  {p.name}
                  <small>{[p.team?.name, p.position].filter(Boolean).join(" · ")}</small>
                </span>
                {(() => {
                  const g = p.summary.find(([k]) => /^(G|Gol|Goals?)$/i.test(k))?.[1];
                  return g !== undefined ? <span className="age">{g} gol</span> : null;
                })()}
              </Link>
            ) : null,
          )}
        </section>
      )}

      {leagues.map((code, i) => {
        const lg = leagueByCode(code)!;
        const rows = leagueData[i];
        return (
          <section className="card" key={`l${code}`}>
            <Link href={`/lig/${code}`} className="card-head">
              <LeagueIcon league={lg} logo={logos[code]} size={22} /> {lg.name}
              <span className="more">Puan durumu ›</span>
            </Link>
            {rows.length ? <StandingsTable rows={rows.slice(0, 5)} league={code} /> : <div className="empty">Puan durumu yok.</div>}
          </section>
        );
      })}
    </>
  );
}
