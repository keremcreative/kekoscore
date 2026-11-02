import { initTz } from "@/lib/tz";
import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DateNav } from "@/components/DateNav";
import { LeagueIcon } from "@/components/LeagueIcon";
import { LiveHero, type Featured } from "@/components/LiveHero";
import { MatchRow } from "@/components/MatchRow";
import { dataSourceName, getLeagueLogos, getScoreboard } from "@/lib/data";
import { parseYmd, ymd } from "@/lib/format";
import { LEAGUES } from "@/lib/leagues";
import { serverFavs } from "@/lib/favsServer";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ d?: string; canli?: string }> }) {
  await initTz();
  const sp = await searchParams;
  const date = parseYmd(sp.d);
  const liveOnly = sp.canli === "1";
  const key = ymd(date);

  const today = ymd(new Date());
  const [results, logos] = await Promise.all([
    Promise.allSettled(LEAGUES.map((l) => getScoreboard(l.code, key))),
    getLeagueLogos(),
  ]);
  const sections = LEAGUES.map((league, i) => {
    const r = results[i];
    const matches = r.status === "fulfilled" ? r.value : [];
    return {
      league,
      matches: (liveOnly ? matches.filter((m) => m.state === "in") : matches).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }).filter((s) => s.matches.length);

  // Favoriler: favori liglerin bölümleri en üste, favori takımların maçları ayrı kartta
  const favs = await serverFavs();
  const favTeams = new Set(favs.filter((f) => f.kind === "team").map((f) => f.ref));
  const favLeagues = new Set(favs.filter((f) => f.kind === "league").map((f) => f.ref));
  sections.sort((a, b) => Number(favLeagues.has(b.league.code)) - Number(favLeagues.has(a.league.code)));
  const favMatches = sections
    .flatMap((s) => s.matches.filter((m) => favTeams.has(`${s.league.code}/${m.home.team.id}`) || favTeams.has(`${s.league.code}/${m.away.team.id}`)))
    .sort((a, b) => a.date.localeCompare(b.date));

  const failed = results.filter((r) => r.status === "rejected").length;
  const anyLive = sections.some((s) => s.matches.some((m) => m.state === "in"));

  // En üstteki kart: canlı maçlar (lig sırasına göre); yoksa bugünün sıradaki maçları
  const all: Featured[] = LEAGUES.flatMap((league, i) => {
    const r = results[i];
    return r.status === "fulfilled" ? r.value.map((match) => ({ match, league })) : [];
  });
  let featured = all.filter((f) => f.match.state === "in");
  if (!featured.length && key === today && !liveOnly) {
    featured = all
      .filter((f) => f.match.state === "pre")
      .sort((a, b) => a.match.date.localeCompare(b.match.date))
      .slice(0, 3);
  }

  return (
    <>
      <AutoRefresh active={anyLive} />
      {key === today && <LiveHero items={featured.slice(0, 8)} logos={logos} />}
      <DateNav selected={date} liveOnly={liveOnly} />
      {failed === LEAGUES.length && <p className="notice error">Veri kaynağına ulaşılamadı. İnternet bağlantını kontrol et.</p>}
      {sections.length === 0 && failed < LEAGUES.length && (
        <p className="empty">{liveOnly ? "Şu an canlı maç yok." : "Bu tarihte maç yok."}</p>
      )}
      {favMatches.length > 0 && (
        <section className="card fav-card">
          <Link href="/favoriler" className="card-head">
            <span className="fav-star" aria-hidden>★</span>
            <span>Favori takımlarım</span>
            <span className="more">Tümü ›</span>
          </Link>
          {favMatches.map((m) => (
            <MatchRow key={m.id} m={m} />
          ))}
        </section>
      )}
      {sections.map(({ league, matches }) => (
        <section className="card" key={league.code}>
          <Link href={`/lig/${league.code}`} className="card-head">
            <LeagueIcon league={league} logo={logos[league.code]} />
            <span>{league.name}</span>
            <span className="country">{league.country}</span>
            <span className="more">Puan durumu ›</span>
          </Link>
          {matches.map((m) => (
            <MatchRow key={m.id} m={m} />
          ))}
        </section>
      ))}
      <p className="foot">Veri: {dataSourceName} · Reklam yok, takip yok.</p>
    </>
  );
}
