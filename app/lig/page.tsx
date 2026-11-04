import Link from "next/link";
import { LeagueIcon } from "@/components/LeagueIcon";
import { SearchIcon } from "@/components/SearchBox";
import { getLeagueLogosCached } from "@/lib/data";
import { LEAGUES, type League } from "@/lib/leagues";
import type { LeagueLogo } from "@/lib/types";

export const revalidate = 86400;

/** Ülke değil, kıta / federasyon olanlar "Uluslararası" altında */
const INTL = new Set(["UEFA", "FIFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "Avrupa", "Asya", "Afrika", "Güney Amerika", "Okyanusya", "Dünya", "Milli"]);

function Row({ l, logo }: { l: League; logo?: LeagueLogo }) {
  return (
    <Link href={`/lig/${l.code}`}>
      <span className="flag">
        <LeagueIcon league={l} logo={logo} size={24} />
      </span>
      <span>
        {l.name}
        <small>
          {l.flag} {l.country}
        </small>
      </span>
    </Link>
  );
}

export default async function Leagues() {
  const logos = await getLeagueLogosCached();
  const women = LEAGUES.filter((l) => l.group === "Kadınlar");
  const men = LEAGUES.filter((l) => l.group !== "Kadınlar");
  const featured = LEAGUES.filter((l) => l.group === "Öne çıkanlar");
  const intl = men.filter((l) => INTL.has(l.country));

  // Ülkeler: Türkiye en başta, gerisi alfabetik; her ülkenin ligleri önem sırasıyla
  const byCountry = new Map<string, League[]>();
  for (const l of men) {
    if (INTL.has(l.country)) continue;
    byCountry.set(l.country, [...(byCountry.get(l.country) ?? []), l]);
  }
  const countries = [...byCountry.keys()].sort((a, b) => (a === "Türkiye" ? -1 : b === "Türkiye" ? 1 : a.localeCompare(b, "tr")));

  return (
    <>
      <h1 className="page-title">Ligler</h1>
      <Link href="/ara" className="search-box">
        <SearchIcon /> Lig, takım veya ülke ara
      </Link>

      <div className="group-title">Öne çıkanlar</div>
      <div className="card league-list">
        {featured.map((l) => (
          <Row key={l.code} l={l} logo={logos[l.code]} />
        ))}
      </div>

      <div className="group-title">Ülkeler · {countries.length}</div>
      <div className="card country-list">
        {countries.map((c) => {
          const list = byCountry.get(c)!;
          return (
            <details key={c} open={c === "Türkiye"}>
              <summary>
                <span className="cflag">{list[0].flag}</span>
                <span className="cname">{c}</span>
                <small>{list.length}</small>
              </summary>
              <div className="league-list">
                {list.map((l) => (
                  <Row key={l.code} l={l} logo={logos[l.code]} />
                ))}
              </div>
            </details>
          );
        })}
      </div>

      <div className="group-title">Uluslararası</div>
      <div className="card league-list">
        {intl.map((l) => (
          <Row key={l.code} l={l} logo={logos[l.code]} />
        ))}
      </div>

      <div className="group-title">Kadınlar</div>
      <div className="card league-list">
        {women.map((l) => (
          <Row key={l.code} l={l} logo={logos[l.code]} />
        ))}
      </div>
    </>
  );
}
