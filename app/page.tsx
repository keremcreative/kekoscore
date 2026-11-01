import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DateNav } from "@/components/DateNav";
import { MatchRow } from "@/components/MatchRow";
import { dataSourceName, getScoreboard } from "@/lib/data";
import { parseYmd, ymd } from "@/lib/format";
import { LEAGUES } from "@/lib/leagues";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ d?: string; canli?: string }> }) {
  const sp = await searchParams;
  const date = parseYmd(sp.d);
  const liveOnly = sp.canli === "1";
  const key = ymd(date);

  const results = await Promise.allSettled(LEAGUES.map((l) => getScoreboard(l.code, key)));
  const sections = LEAGUES.map((league, i) => {
    const r = results[i];
    const matches = r.status === "fulfilled" ? r.value : [];
    return {
      league,
      matches: (liveOnly ? matches.filter((m) => m.state === "in") : matches).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }).filter((s) => s.matches.length);

  const failed = results.filter((r) => r.status === "rejected").length;
  const anyLive = sections.some((s) => s.matches.some((m) => m.state === "in"));

  return (
    <>
      <AutoRefresh active={anyLive} />
      <DateNav selected={date} liveOnly={liveOnly} />
      {failed === LEAGUES.length && <p className="notice error">Veri kaynağına ulaşılamadı. İnternet bağlantını kontrol et.</p>}
      {sections.length === 0 && failed < LEAGUES.length && (
        <p className="empty">{liveOnly ? "Şu an canlı maç yok." : "Bu tarihte maç yok."}</p>
      )}
      {sections.map(({ league, matches }) => (
        <section className="card" key={league.code}>
          <Link href={`/lig/${league.code}`} className="card-head">
            <span>{league.flag}</span>
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
