import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { TeamLogo } from "@/components/TeamLogo";
import { FavButton } from "@/components/social/FavButton";
import { getPlayer } from "@/lib/data";
import { leagueByCode } from "@/lib/leagues";
import { initTz } from "@/lib/tz";

const STAT_TR: Record<string, string> = {
  starts: "İlk 11", appearances: "Maç", subIns: "Yedekten", totalGoals: "Gol", goalAssists: "Asist",
  totalShots: "Şut", shotsOnTarget: "İsabetli şut", foulsCommitted: "Faul", foulsSuffered: "Maruz kaldığı faul",
  yellowCards: "Sarı kart", redCards: "Kırmızı kart", offsides: "Ofsayt", saves: "Kurtarış", goalsConceded: "Yediği gol",
  shotsFaced: "Karşılaştığı şut", cleanSheet: "Gol yemeden", minutes: "Dakika",
};
const SUMMARY_TR: Record<string, string> = {
  "STRT (SUB)": "Maç (yedek)", STRT: "İlk 11", G: "Gol", A: "Asist", SH: "Şut", SHOT: "Şut", SV: "Kurtarış", GA: "Yediği gol", CS: "Gol yemeden",
};
const trSplit = (s: string) =>
  s.replace("English Premier League", "Premier Lig").replace("Champions League", "Şampiyonlar Ligi").replace("Europa League", "Avrupa Ligi")
    .replace("Conference League", "Konferans Ligi").replace("Turkish Super Lig", "Süper Lig").replace("Spanish LALIGA", "LaLiga")
    .replace("International Friendly", "Hazırlık maçı").replace("FIFA World Cup", "Dünya Kupası").replace("UEFA Nations League", "Uluslar Ligi");

export default async function PlayerPage({ params }: { params: Promise<{ league: string; id: string }> }) {
  await initTz();
  const { league, id } = await params;
  const p = await getPlayer(league, id).catch(() => null);
  if (!p) notFound();
  const lg = leagueByCode(league);
  const facts: [string, string | undefined][] = [
    ["Mevki", p.position], ["Forma", p.number ? `#${p.number}` : undefined], ["Yaş", p.age !== undefined ? String(p.age) : undefined],
    ["Doğum", p.birth], ["Uyruk", p.nationality], ["Boy", p.height], ["Kilo", p.weight],
  ];
  const idx = (n: string) => p.stats.names.indexOf(n);
  const cols = ["starts", "appearances", "totalGoals", "goalAssists", "totalShots", "shotsOnTarget", "saves", "goalsConceded", "yellowCards", "redCards"].filter((n) => idx(n) >= 0);
  const extra = p.stats.names.filter((n) => !cols.includes(n));
  return (
    <>
      {p.team && (
        <Link href={`/takim/${league}/${p.team.id}`} className="back">‹ {p.team.name}</Link>
      )}
      <section className="card phero">
        <PlayerPhoto src={p.photo} name={p.name} />
        <div className="phero-main">
          <h1>{p.name}</h1>
          {p.team && (
            <Link href={`/takim/${league}/${p.team.id}`} className="phero-team">
              <TeamLogo team={p.team} size={18} /> {p.team.name}
            </Link>
          )}
          <div className="phero-sub">
            {p.flag && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.flag} alt="" width={18} height={12} />
            )}
            {[p.position, p.number && `#${p.number}`].filter(Boolean).join(" · ")}
          </div>
        </div>
        <FavButton kind="player" refId={`${league}/${p.id}`} />
      </section>

      {p.summary.length > 0 && (
        <section className="card">
          <div className="section-title">Bu sezon</div>
          <div className="pstats">
            {p.summary.map(([k, v]) => (
              <div key={k}><b>{v}</b><span>{SUMMARY_TR[k] ?? k}</span></div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <div className="section-title">Bilgiler</div>
        <dl className="facts">
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </section>

      {p.stats.splits.map((s) => (
        <section className="card" key={s.name + s.teamId}>
          <div className="section-title">{trSplit(s.name)}</div>
          <div className="pstats">
            {[...cols, ...extra].map((n) => (
              <div key={n}><b>{s.stats[idx(n)] ?? "-"}</b><span>{STAT_TR[n] ?? p.stats.labels[idx(n)] ?? n}</span></div>
            ))}
          </div>
        </section>
      ))}
      {!p.stats.splits.length && <div className="card empty">Bu sezon için istatistik yok.</div>}
      <p className="foot-note">{lg?.name} · Veri: ESPN</p>
    </>
  );
}
