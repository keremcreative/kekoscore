import Link from "next/link";
import { LeagueIcon } from "@/components/LeagueIcon";
import { getLeagueLogosCached } from "@/lib/data";
import { LEAGUE_GROUPS, LEAGUES } from "@/lib/leagues";

export const revalidate = 86400;

export default async function Leagues() {
  const logos = await getLeagueLogosCached();
  return (
    <>
      <h1 className="page-title">Ligler</h1>
      {LEAGUE_GROUPS.map((g) => {
        const list = LEAGUES.filter((l) => l.group === g);
        if (!list.length) return null;
        return (
          <section key={g}>
            <div className="group-title">{g}</div>
            <div className="card league-list">
              {list.map((l) => (
                <Link key={l.code} href={`/lig/${l.code}`}>
                  <span className="flag">
                    <LeagueIcon league={l} logo={logos[l.code]} size={28} />
                  </span>
                  <span>
                    {l.name}
                    <small>
                      {l.flag} {l.country}
                    </small>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
