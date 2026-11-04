import { initTz } from "@/lib/tz";
import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DateNav } from "@/components/DateNav";
import { SearchIcon } from "@/components/SearchBox";
import { LeagueIcon } from "@/components/LeagueIcon";
import { LiveHero, type Featured } from "@/components/LiveHero";
import { MatchRow } from "@/components/MatchRow";
import { getGroupDays, getLeagueLogosCached, getMatch, getTrDays, groupLeagues, groupOf } from "@/lib/data";
import { leagueByCode, type League } from "@/lib/leagues";
import { serverFavs } from "@/lib/favsServer";
import { LeagueSection } from "@/components/LeagueSection";
import { COLLAPSE_COOKIE, OPEN_COOKIE } from "@/lib/collapse";
import { matchBigKind } from "@/lib/bigClubs";
import { dayTag, homeDay, type Filter } from "@/lib/homeDay";
import { leagueRows } from "@/lib/homeActions";
import { ymd } from "@/lib/format";
import type { LeagueLogo, Match } from "@/lib/types";
import { cookies } from "next/headers";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

/** Biten maç üstteki kartta bu kadar süre görünür (başlama saatinden itibaren) */
const HERO_DONE_MS = 5 * 3600e3;

/** Ana sayfada her zaman en üstte duran ligler */
const CORE = ["tur.1", "eng.1", "esp.1", "ita.1", "ger.1", "fra.1"];

type Section = { league: League; matches: Match[] };

/** Söz verilen sürede gelmeyen isteği beklemeden geç (ör. canlı kartın momentum grafiği) */
const within = <T,>(p: Promise<T>, ms: number): Promise<T | undefined> =>
  Promise.race([p.catch(() => undefined), new Promise<undefined>((r) => setTimeout(r, ms))]);

const az = (a: Section, b: Section) => a.league.country.localeCompare(b.league.country, "tr") || a.league.name.localeCompare(b.league.name, "tr");

/**
 * Ana sayfa iki aşamada gelir:
 *  1. Ana ligler (~50 lig: Süper Lig, büyük ligler, Avrupa kupaları, önemli kupalar) ve
 *     favori ligler beklenir, üstteki kart ve açık lig kartları hemen gösterilir.
 *  2. Geri kalan ~120 lig arkadan akar ("Diğer ligler ve kupalar"); sayfa onları beklemez.
 * Kapalı gelen lig kartlarının maçları sayfayla gönderilmez, dokununca yüklenir.
 */
export default async function Home({ searchParams }: { searchParams: Promise<{ d?: string; canli?: string; durum?: string }> }) {
  await initTz();
  const sp = await searchParams;
  const filter: Filter = sp.canli === "1" || sp.durum === "canli" ? "canli" : sp.durum === "biten" ? "biten" : "hepsi";
  const { date, key, today, isToday, from, pass, dayList } = homeDay(sp.d, filter);

  // Favoriler: favori liglerin bölümleri en üste, favori takımların maçları ayrı kartta
  const favs = await serverFavs();
  const jar = await cookies();
  const readSet = (name: string) => new Set(decodeURIComponent(jar.get(name)?.value ?? "").split(",").filter(Boolean));
  const ui: SectionUi = { closedSet: readSet(COLLAPSE_COOKIE), openSet: readSet(OPEN_COOKIE), filter, key, d: sp.d ?? "" };
  const favTeams = new Set(favs.filter((f) => f.kind === "team").map((f) => f.ref));
  const favLeagues = new Set(favs.filter((f) => f.kind === "league").map((f) => f.ref));
  const isFav = (code: string, m: Match) => favTeams.has(`${code}/${m.home.team.id}`) || favTeams.has(`${code}/${m.away.team.id}`);

  // "Diğer" gruptaki favori ligler ve favori takımların ligleri de ilk aşamada (tek tek) çekilir
  const extraCodes = [...new Set([...favLeagues, ...[...favTeams].map((r) => r.split("/")[0])])].filter(
    (c) => leagueByCode(c) && groupOf(c) === "diger",
  );
  const [ana, extra, logos = {}] = await Promise.all([
    getGroupDays("ana", from, key),
    Promise.all(extraCodes.map((c) => getTrDays(c, from, key).catch(() => null))),
    // Logolar günde bir yenilenir; önbellek boşsa (ör. yeni yayından sonra) sayfa onları
    // beklemesin, o seferlik bayraklar görünsün
    within(getLeagueLogosCached(), 1000),
  ]);
  const dayMatches = [
    ...groupLeagues("ana").map((league, i) => ({ league, all: dayList(ana[i]) })),
    ...extraCodes.map((c, i) => ({ league: leagueByCode(c)!, all: dayList(extra[i]) })),
  ];
  const sections: Section[] = dayMatches.map(({ league, all }) => ({ league, matches: all.filter(pass) })).filter((s) => s.matches.length);

  // Sıralama: Süper Lig ve 5 büyük lig her zaman en üstte (bu sırayla). Sonra takip edilenler
  // (favori ligler, Avrupa kupaları, büyük kulüplerin / favori takımların oynadığı kupalar) A-Z.
  // Geri kalan ligler en altta, A-Z ve kapalı gelir.
  const core = (code: string) => CORE.indexOf(code);
  const followed = (s: Section) =>
    favLeagues.has(s.league.code) || s.league.tier === 1 || s.matches.some((m) => isFav(s.league.code, m) || !!matchBigKind(m));
  const top = [
    ...sections.filter((s) => core(s.league.code) >= 0).sort((a, b) => core(a.league.code) - core(b.league.code)),
    ...sections.filter((s) => core(s.league.code) < 0 && followed(s)).sort(az),
  ];
  const rest = sections.filter((s) => core(s.league.code) < 0 && !followed(s));
  const favMatches = sections.flatMap((s) => s.matches.filter((m) => isFav(s.league.code, m))).sort((a, b) => a.date.localeCompare(b.date));

  const failed = [...ana, ...extra].filter((r) => r === null).length;
  const anyLive = dayMatches.some((s) => s.all.some((m) => m.state === "in"));

  // En üstteki kart: ana liglerin, büyük kulüplerin ve favorilerin canlı maçları;
  // sonra yeni biten maçlar, sonra sıradaki maçlar. Küçük liglerin maçları burada yer kaplamasın.
  const t = Date.now();
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
  return (
    <>
      <AutoRefresh active={anyLive} />
      {isToday && featured.length > 0 && (
        // Kart hemen görünür; canlı maçların momentum grafiği hazır olunca eklenir
        <Suspense fallback={<LiveHero items={featured.slice(0, 10)} logos={logos} />}>
          <HeroWithMomentum items={featured.slice(0, 10)} logos={logos} />
        </Suspense>
      )}
      <Link href="/ara" className="search-box">
        <SearchIcon /> Takım, lig veya ülke ara
      </Link>
      <DateNav selected={date} filter={filter} />
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
      {top.map((s) => (
        <LeagueCard key={s.league.code} s={s} minor={false} ui={ui} logos={logos} />
      ))}
      <Suspense fallback={<p className="others-loading">Diğer ligler yükleniyor…</p>}>
        <OtherLeagues
          from={from}
          skip={new Set(extraCodes)}
          rest={rest}
          topCount={top.length}
          firstFailed={failed}
          firstTotal={ana.length + extra.length}
          liveShown={anyLive}
          isBig={(code, m) => isFav(code, m) || !!matchBigKind(m)}
          ui={ui}
          logos={logos}
        />
      </Suspense>
      <p className="foot">Kerem&apos;in Hayratıdır · Reklam yok, Pop-up yok</p>
    </>
  );
}

/** İlk birkaç canlı maça küçük momentum grafiği; geç kalırsa grafiksiz kalır */
async function HeroWithMomentum({ items, logos }: { items: Featured[]; logos: Record<string, LeagueLogo> }) {
  const withMomentum = await Promise.all(
    items.map(async (f, i) =>
      f.match.state === "in" && items.slice(0, i).filter((x) => x.match.state === "in").length < 4
        ? { ...f, momentum: await within(getMatch(f.league.code, f.match.id).then((d) => d.momentum), 4000) }
        : f,
    ),
  );
  return <LiveHero items={withMomentum} logos={logos} />;
}

/** İkinci aşama: kalan ~120 lig. Takip edilen bir maç varsa açık, yoksa en altta kapalı. */
async function OtherLeagues({
  from,
  skip,
  rest,
  topCount,
  firstFailed,
  firstTotal,
  liveShown,
  isBig,
  ui,
  logos,
}: {
  from: string;
  skip: Set<string>;
  rest: Section[];
  topCount: number;
  firstFailed: number;
  firstTotal: number;
  liveShown: boolean;
  isBig: (code: string, m: Match) => boolean;
  ui: SectionUi;
  logos: Record<string, LeagueLogo>;
}) {
  const { pass, dayList } = homeDay(ui.d || undefined, ui.filter);
  const diger = await getGroupDays("diger", from, ui.key);
  const day = groupLeagues("diger")
    .map((league, i) => ({ league, all: dayList(diger[i]) }))
    .filter(({ league }) => !skip.has(league.code));
  const sections: Section[] = day.map(({ league, all }) => ({ league, matches: all.filter(pass) })).filter((s) => s.matches.length);
  const followed = sections.filter((s) => s.matches.some((m) => isBig(s.league.code, m))).sort(az);
  const minor = [...rest, ...sections.filter((s) => !followed.includes(s))].sort(az);
  const failed = firstFailed + diger.filter((r) => r === null).length;
  const total = firstTotal + diger.length;
  const anyLive = !liveShown && day.some((s) => s.all.some((m) => m.state === "in"));
  const shown = topCount + followed.length + minor.length;
  return (
    <>
      {anyLive && <AutoRefresh active />}
      {failed >= total && <p className="notice error">Veri kaynağına ulaşılamadı. İnternet bağlantını kontrol et.</p>}
      {shown === 0 && failed < total && (
        <p className="empty">{ui.filter === "canli" ? "Şu an canlı maç yok." : ui.filter === "biten" ? "Henüz biten maç yok." : "Bu tarihte maç yok."}</p>
      )}
      {followed.map((s) => (
        <LeagueCard key={s.league.code} s={s} minor={false} ui={ui} logos={logos} />
      ))}
      {minor.length > 0 && topCount + followed.length > 0 && <div className="others-head">Diğer ligler ve kupalar</div>}
      {minor.map((s) => (
        <LeagueCard key={s.league.code} s={s} minor ui={ui} logos={logos} />
      ))}
    </>
  );
}

type SectionUi = { closedSet: Set<string>; openSet: Set<string>; filter: Filter; key: string; d: string };

/**
 * Lig kartı. Takip edilmeyen ligler varsayılan kapalı gelir (dokununca açılır ve hatırlanır).
 * Kapalı gelen kartın maç satırları sayfaya konmaz; açılınca sunucudan istenir.
 */
function LeagueCard({ s: { league, matches }, minor, ui, logos }: { s: Section; minor: boolean; ui: SectionUi; logos: Record<string, LeagueLogo> }) {
  const live = matches.filter((m) => m.state === "in").length;
  const closed = minor ? !ui.openSet.has(league.code) && ui.filter !== "canli" : ui.closedSet.has(league.code);
  return (
    <LeagueSection
      code={league.code}
      initiallyClosed={closed}
      cookie={minor ? OPEN_COOKIE : COLLAPSE_COOKIE}
      storeOpen={minor}
      load={closed ? leagueRows.bind(null, league.code, ui.d, ui.filter) : undefined}
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
      {closed
        ? null
        : matches.map((m) => (
            <MatchRow key={m.id} m={m} dayTag={dayTag(m, ui.key)} />
          ))}
    </LeagueSection>
  );
}
