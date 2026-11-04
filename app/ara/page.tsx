import Link from "next/link";
import { LeagueIcon } from "@/components/LeagueIcon";
import { MatchRow } from "@/components/MatchRow";
import { SearchBox } from "@/components/SearchBox";
import { TeamLogo } from "@/components/TeamLogo";
import { getAllLeagueDays, getLeagueLogosCached } from "@/lib/data";
import { shiftDays, ymd } from "@/lib/format";
import { LEAGUES, MAIN_LEAGUES } from "@/lib/leagues";
import { matches, teamIndex } from "@/lib/search";
import { initTz } from "@/lib/tz";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await initTz();
  const q = ((await searchParams).q ?? "").trim().slice(0, 60);
  const logos = await getLeagueLogosCached();

  if (q.length < 2) {
    return (
      <>
        <SearchBox initial={q} />
        <section className="card">
          <div className="section-title">Popüler ligler</div>
          {MAIN_LEAGUES.slice(0, 9).map((l) => (
            <Link key={l.code} href={`/lig/${l.code}`} className="search-row">
              <LeagueIcon league={l} logo={logos[l.code]} />
              <span className="sr-name">{l.name}</span>
              <small>{l.country}</small>
            </Link>
          ))}
        </section>
      </>
    );
  }

  const now = new Date();
  const [teams, days] = await Promise.all([teamIndex().catch(() => []), getAllLeagueDays(ymd(shiftDays(now, -1)), ymd(now)).catch(() => [])]);
  // Bugünün maçlarında geçen takımlar da aransın (kupalardaki alt lig takımları vb.)
  const seen = new Set(teams.map((t) => t.team.id));
  const all = [...teams];
  const games: Match[] = [];
  days.forEach((list, i) => {
    for (const m of list ?? []) {
      for (const side of [m.home, m.away]) {
        if (!seen.has(side.team.id)) {
          seen.add(side.team.id);
          all.push({ team: side.team, league: LEAGUES[i].code });
        }
      }
      if (matches(q, m.home.team.name, m.home.team.short) || matches(q, m.away.team.name, m.away.team.short)) games.push(m);
    }
  });

  const leagueHits = LEAGUES.filter((l) => matches(q, l.name, l.country, l.code.replace(/\./g, " "))).slice(0, 12);
  const teamHits = all.filter((t) => matches(q, t.team.name, t.team.short, t.team.abbr)).slice(0, 20);
  games.sort((a, b) => a.date.localeCompare(b.date));
  const nothing = !leagueHits.length && !teamHits.length && !games.length;

  return (
    <>
      <SearchBox initial={q} />
      {nothing && <p className="empty">“{q}” için sonuç yok.</p>}
      {games.length > 0 && (
        <section className="card">
          <div className="section-title">Bugünkü maçlar</div>
          {games.slice(0, 10).map((m) => (
            <MatchRow key={m.id} m={m} />
          ))}
        </section>
      )}
      {teamHits.length > 0 && (
        <section className="card">
          <div className="section-title">Takımlar</div>
          {teamHits.map(({ team, league }) => (
            <Link key={team.id} href={`/takim/${league}/${team.id}`} className="search-row">
              <TeamLogo team={team} size={22} />
              <span className="sr-name">{team.name}</span>
              <small>{LEAGUES.find((l) => l.code === league)?.name}</small>
            </Link>
          ))}
        </section>
      )}
      {leagueHits.length > 0 && (
        <section className="card">
          <div className="section-title">Ligler ve kupalar</div>
          {leagueHits.map((l) => (
            <Link key={l.code} href={`/lig/${l.code}`} className="search-row">
              <LeagueIcon league={l} logo={logos[l.code]} />
              <span className="sr-name">{l.name}</span>
              <small>{l.country}</small>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
