import Link from "next/link";
import { LeagueIcon } from "@/components/LeagueIcon";
import { getLeagueLogos } from "@/lib/data";
import { LEAGUES } from "@/lib/leagues";

export const revalidate = 86400;

export default async function Leagues() {
  const logos = await getLeagueLogos();
  return (
    <>
      <h1 className="page-title">Ligler</h1>
      <div className="card league-list">
        {LEAGUES.map((l) => (
          <Link key={l.code} href={`/lig/${l.code}`}>
            <span className="flag">
              <LeagueIcon league={l} logo={logos[l.code]} size={28} />
            </span>
            <span>
              {l.name}
              <small>{l.country}</small>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
