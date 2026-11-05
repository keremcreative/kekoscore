import { initTz } from "@/lib/tz";
import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DateNav, type Filter } from "@/components/DateNav";
import { SearchIcon } from "@/components/SearchBox";
import { LeagueIcon } from "@/components/LeagueIcon";
import { LiveHero, type Featured } from "@/components/LiveHero";
import { MatchRow } from "@/components/MatchRow";
import { MUST, getAllLeagueDays, getLeagueLogosCached, getMatch, getTrDays } from "@/lib/data";
import { hourNow, parseYmd, shiftDays, ymd } from "@/lib/format";
import { LEAGUES, compareLeagues } from "@/lib/leagues";
import { serverFavs } from "@/lib/favsServer";
import { LeagueSection } from "@/components/LeagueSection";
import { COLLAPSE_COOKIE, OPEN_COOKIE } from "@/lib/collapse";
import { matchBigKind } from "@/lib/bigClubs";
import type { Match } from "@/lib/types";
import { cookies } from "next/headers";
import { Fragment } from "react";

export const dynamic = "force-dynamic";

/** Söz verilen sürede gelmeyen isteği beklemeden geç */
const within = <T,>(p: Promise<T>, ms: number): Promise<T | undefined> =>
  Promise.race([p.catch(() => undefined), new Promise<undefined>((r) => setTimeout(r, ms))]);

/** Dünün maçları (seçili saat dilimiyle) bu saate kadar "Bugün" listesinde kalır */
const KEEP_YESTERDAY_UNTIL = 12;
/** Biten maç üstteki kartta bu kadar süre görünür (başlama saatinden itibaren) */
const HERO_DONE_MS = 5 * 3600e3;



export default async function Home({ searchParams }: { searchParams: Promise<{ d?: string; canli?: string; durum?: string }> }) {
  await initTz();
  const sp = await searchParams;
  const date = parseYmd(sp.d);
  const filter: Filter = sp.canli === "1" || sp.durum === "canli" ? "canli" : sp.durum === "biten" ? "biten" : "hepsi";
  const key = ymd(date);
  const now = new Date();
  const today = ymd(now);
  const isToday = key === today;
  const yesterday = ymd(shiftDays(now, -1));
  // Bugün açıkken dünün maçlarını da çek: gece biten ya da hâlâ süren maçlar kaybolmasın
  const from = isToday ? yesterday : key;

  const [cached, logos] = await Promise.all([getAllLeagueDays(from, key).catch(() => LEAGUES.map(() => null)), getLeagueLogosCached()]);
  // Önbellekteki kayıtta alınamamış ligler varsa onları yeniden dene; yoksa o ligler ana sayfadan kaybolur
  // Küçük ligler için en fazla 2 sn beklenir (o lig bir sonraki yenilemede gelir); Süper Lig, 5 büyük lig
  // ve Avrupa kupaları ana sayfadan asla kaybolmasın diye 7 sn'ye kadar beklenir ve önce onlar istenir.
  const retry = (i: number) => within(getTrDays(LEAGUES[i].code, from, key), MUST.has(LEAGUES[i].code) ? 7000 : 2000).then((x) => x ?? null);
  const results: (Match[] | null)[] = [...cached];
  const mustIdx = cached.map((r, i) => i).filter((i) => !cached[i] && MUST.has(LEAGUES[i].code));
  const restIdx = cached.map((r, i) => i).filter((i) => !cached[i] && !MUST.has(LEAGUES[i].code));
  const mustP = Promise.all(mustIdx.map(async (i) => (results[i] = await retry(i))));
  await Promise.all([mustP, ...restIdx.map(async (i) => (results[i] = await retry(i)))]);
  const keepYesterday = hourNow(now) < KEEP_YESTERDAY_UNTIL;
  const visible = (m: Match) => {
    if (ymd(new Date(m.date)) === key) return true;
    // dünden kalanlar: süren maçlar her zaman, bitenler öğlene kadar
    return m.state === "in" || (m.state === "post" && keepYesterday);
  };
  const pass = (m: Match) => (filter === "canli" ? m.state === "in" : filter === "biten" ? m.state === "post" : true);

  const dayMatches = LEAGUES.map((league, i) => {
    const r = results[i];
    return { league, all: r ? r.filter(visible).sort((a, b) => a.date.localeCompare(b.date)) : [] };
  });
  const sections = dayMatches.map(({ league, all }) => ({ league, matches: all.filter(pass) })).filter((s) => s.matches.length);

  // Favoriler: favori liglerin bölümleri en üste, favori takımların maçları ayrı kartta
  const favs = await serverFavs();
  const jar = await cookies();
  const readSet = (name: string) => new Set(decodeURIComponent(jar.get(name)?.value ?? "").split(",").filter(Boolean));
  const closedSet = readSet(COLLAPSE_COOKIE);
  const openSet = readSet(OPEN_COOKIE);
  const favTeams = new Set(favs.filter((f) => f.kind === "team").map((f) => f.ref));
  const favLeagues = new Set(favs.filter((f) => f.kind === "league").map((f) => f.ref));
  const isFav = (code: string, m: Match) => favTeams.has(`${code}/${m.home.team.id}`) || favTeams.has(`${code}/${m.away.team.id}`);
  // Sıralama popülerliğe göre (lib/leagues.ts'deki sıra): Süper Lig, 5 büyük lig, Avrupa kupaları,
  // milli turnuvalar, sonra diğer ligler. Alfabetik DEĞİL: Kerem en çok takip edilenleri üstte istiyor.
  const byRank = (a: (typeof sections)[number], b: (typeof sections)[number]) => compareLeagues(a.league.code, b.league.code);
  const followed = (s: (typeof sections)[number]) =>
    favLeagues.has(s.league.code) || s.league.tier === 1 || s.matches.some((m) => isFav(s.league.code, m) || !!matchBigKind(m));
  const top = sections.filter(followed).sort(byRank);
  const rest = sections.filter((s) => !followed(s)).sort(byRank);
  const favMatches = sections.flatMap((s) => s.matches.filter((m) => isFav(s.league.code, m))).sort((a, b) => a.date.localeCompare(b.date));

  const failed = results.filter((r) => r === null).length;
  const anyLive = dayMatches.some((s) => s.all.some((m) => m.state === "in"));

  // En üstteki kart: ana liglerin, büyük kulüplerin ve favorilerin canlı maçları;
  // sonra yeni biten maçlar, sonra sıradaki maçlar. Küçük liglerin maçları burada yer kaplamasın.
  const t = now.getTime();
  const all: Featured[] = dayMatches
    .flatMap(({ league, all }) => all.map((match) => ({ match, league })))
    .filter(({ match, league }) => league.tier === 1 || !!matchBigKind(match) || isFav(league.code, match));
  const live = all.filter((f) => f.match.state === "in");
  const done = all
    .filter((f) => f.match.state === "post" && t - new Date(f.match.date).getTime() < HERO_DONE_MS)
    .sort((a, b) => b.match.date.localeCompare(a.match.date));
  const next = all
    .filter((f) => f.match.state === "pre" && ymd(new Date(f.match.date)) === today)
    .sort((a, b) => a.match.date.localeCompare(b.match.date));
  const featured = filter === "hepsi" ? [...live, ...done.slice(0, 4), ...next.slice(0, live.length ? 0 : 3)] : [];
  // İlk birkaç canlı maça küçük momentum grafiği
  await Promise.all(
    featured
      .filter((f) => f.match.state === "in")
      .slice(0, 4)
      .map(async (f) => {
        // Grafik geç kalırsa kart grafiksiz açılır
        f.momentum = await within(getMatch(f.league.code, f.match.id).then((d) => d.momentum), 1500);
      }),
  );

  return (
    <>
      <AutoRefresh active={anyLive} />
      {isToday && <LiveHero items={featured.slice(0, 10)} logos={logos} />}
      <Link href="/ara" className="search-box">
        <SearchIcon /> Takım, lig veya ülke ara
      </Link>
      <DateNav selected={date} filter={filter} />
      {failed === LEAGUES.length && <p className="notice error">Veri kaynağına ulaşılamadı. İnternet bağlantını kontrol et.</p>}
      {sections.length === 0 && failed < LEAGUES.length && (
        <p className="empty">{filter === "canli" ? "Şu an canlı maç yok." : filter === "biten" ? "Henüz biten maç yok." : "Bu tarihte maç yok."}</p>
      )}
      {favMatches.length > 0 && (
        <section className="card fav-card">
          <Link href="/favoriler" className="card-head">
            <span className="fav-star" aria-hidden>★</span>
            <span>Favori takımlarım</span>
            <span className="more">Tümü ›</span>
          </Link>
          {favMatches.map((m) => (
            <MatchRow key={m.id} m={m} dayTag={dayTag(m, key)} />
          ))}
        </section>
      )}
      {[...top, ...rest].map(({ league, matches }, i) => {
        // Takip edilmeyen ligler varsayılan kapalı gelir (dokununca açılır ve hatırlanır)
        const minor = i >= top.length;
        const live = matches.filter((m) => m.state === "in").length;
        return (
          <Fragment key={league.code}>
          {i === top.length && i > 0 && <div className="others-head">Diğer ligler ve kupalar</div>}
          <LeagueSection
            key={league.code}
            code={league.code}
            initiallyClosed={minor ? !openSet.has(league.code) && filter !== "canli" : closedSet.has(league.code)}
            cookie={minor ? OPEN_COOKIE : COLLAPSE_COOKIE}
            storeOpen={minor}
            head={
              <Link href={`/lig/${league.code}`} className="card-head">
                <LeagueIcon league={league} logo={logos[league.code]} />
                <span>{league.name}</span>
                <span className="country">{league.country}</span>
                {live > 0 && <span className="count live">{live} canlı</span>}
                <span className="count">{matches.length}</span>
                <span className="more">›</span>
              </Link>
            }
          >
            {matches.map((m) => (
              <MatchRow key={m.id} m={m} dayTag={dayTag(m, key)} />
            ))}
          </LeagueSection>
          </Fragment>
        );
      })}
      <p className="foot">Kerem&apos;in Hayratıdır · Reklam yok, Pop-up yok</p>
    </>
  );
}

/** Seçili günden olmayan (dünden kalan) maçlara küçük "Dün" etiketi */
const dayTag = (m: Match, key: string) => (ymd(new Date(m.date)) < key ? "Dün" : undefined);
