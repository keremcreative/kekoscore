import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { TeamLogo } from "@/components/TeamLogo";
import { FavButton } from "@/components/social/FavButton";
import { getPlayer } from "@/lib/data";
import { leagueByCode } from "@/lib/leagues";
import { initTz } from "@/lib/tz";
import type { PositionGroup } from "@/lib/types";

const STAT_TR: Record<string, string> = {
  starts: "İlk 11", appearances: "Maç", subIns: "Yedek", totalGoals: "Gol", goalAssists: "Asist",
  totalShots: "Şut", shotsOnTarget: "İsabetli", foulsCommitted: "Faul", foulsSuffered: "Faule uğr.",
  yellowCards: "Sarı", redCards: "Kırmızı", offsides: "Ofsayt", saves: "Kurtarış", goalsConceded: "Yediği",
  shotsFaced: "Karşıl. şut", cleanSheet: "Gol yemeden", minutes: "Dakika",
};
const SUMMARY_TR: Record<string, string> = {
  "STRT (SUB)": "Maç (yedek)", STRT: "İlk 11", G: "Gol", A: "Asist", SH: "Şut", SHOT: "Şut", SV: "Kurtarış", GA: "Yediği gol", CS: "Gol yemeden",
};
const POS_TR: Record<PositionGroup, string> = { G: "Kaleci", D: "Defans", M: "Orta saha", F: "Forvet", "?": "Oyuncu" };
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const trSplit = (s: string) =>
  s.replace("English Premier League", "Premier Lig").replace("Champions League", "Şampiyonlar Ligi").replace("Europa League", "Avrupa Ligi")
    .replace("Conference League", "Konferans Ligi").replace("Turkish Super Lig", "Süper Lig").replace("Spanish LALIGA", "LaLiga")
    .replace("International Friendly", "Hazırlık maçı").replace("FIFA World Cup", "Dünya Kupası").replace("UEFA Nations League", "Uluslar Ligi")
    .replace("Italian Serie A", "Serie A").replace("German Bundesliga", "Bundesliga").replace("French Ligue 1", "Ligue 1");

const trDate = (iso?: string) => {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
};

/** Takım rengine göre okunaklı yazı rengi */
function inkFor(hex: string) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? "#16181c" : "#ffffff";
}

export default async function PlayerPage({ params }: { params: Promise<{ league: string; id: string }> }) {
  await initTz();
  const { league, id } = await params;
  const p = await getPlayer(league, id).catch(() => null);
  if (!p) notFound();
  const lg = leagueByCode(league);
  const color = p.teamColor ?? "2a2f38";

  const tiles: [string, string | undefined][] = [
    ["Yaş", p.age !== undefined ? String(p.age) : undefined],
    ["Boy", p.height],
    ["Kilo", p.weight],
    ["Forma", p.number ? `#${p.number}` : undefined],
  ];
  const facts: [string, string | undefined][] = [
    ["Doğum tarihi", trDate(p.birth)],
    ["Uyruk", p.nationality],
    ["Mevki", p.position],
    ["Takım", p.team?.name],
  ];

  const idx = (n: string) => p.stats.names.indexOf(n);
  const keeper = p.pos === "G";
  const cols = (keeper
    ? ["appearances", "starts", "saves", "goalsConceded", "cleanSheet", "yellowCards", "redCards"]
    : ["appearances", "starts", "totalGoals", "goalAssists", "totalShots", "shotsOnTarget", "yellowCards", "redCards"]
  ).filter((n) => idx(n) >= 0);
  const extra = p.stats.names.filter((n) => !cols.includes(n) && STAT_TR[n]);
  const shown = [...cols, ...extra];

  return (
    <>
      {p.team && (
        <Link href={`/takim/${league}/${p.team.id}`} className="back">‹ {p.team.name}</Link>
      )}
      <section className="phero2" style={{ "--tc": `#${color}`, "--ink": inkFor(color) } as React.CSSProperties}>
        {p.number && <span className="phero2-num" aria-hidden>{p.number}</span>}
        <div className="phero2-fav">
          <FavButton kind="player" refId={`${league}/${p.id}`} />
        </div>
        <PlayerPhoto src={p.photo} name={p.name} size={104} />
        <h1>{p.name}</h1>
        <div className="phero2-tags">
          <span className={`pos-badge pos-${p.pos}`}>{POS_TR[p.pos]}</span>
          {p.nationality && (
            <span className="phero2-nat">
              {p.flag && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.flag} alt="" width={18} height={12} />
              )}
              {p.nationality}
            </span>
          )}
        </div>
        {p.team && (
          <Link href={`/takim/${league}/${p.team.id}`} className="phero2-team">
            <TeamLogo team={p.team} size={20} /> {p.team.name} ›
          </Link>
        )}
      </section>

      <div className="ptiles">
        {tiles.map(([k, v]) => (
          <div key={k}>
            <b>{v ?? "–"}</b>
            <span>{k}</span>
          </div>
        ))}
      </div>

      {p.summary.length > 0 && (
        <section className="card">
          <div className="section-title">Bu sezon</div>
          <div className="psum">
            {p.summary.map(([k, v]) => (
              <div key={k}>
                <b>{v}</b>
                <span>{SUMMARY_TR[k] ?? k}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {p.stats.splits.length > 0 ? (
        <section className="card">
          <div className="section-title">Turnuvalara göre</div>
          <div className="ptable-wrap">
            <table className="ptable">
              <thead>
                <tr>
                  <th>Turnuva</th>
                  {shown.map((n) => (
                    <th key={n}>{STAT_TR[n] ?? p.stats.labels[idx(n)] ?? n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.stats.splits.map((s) => (
                  <tr key={s.name + s.teamId}>
                    <td>
                      {trSplit(s.name).replace(/^\d{4}-\d{2}\s*/, "")}
                      {/^\d{4}-\d{2}/.test(s.name) && <small>{s.name.slice(0, 7)}</small>}
                    </td>
                    {shown.map((n) => (
                      <td key={n} className={n === "totalGoals" || n === "saves" ? "hl" : undefined}>
                        {s.stats[idx(n)] ?? "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="card empty">Bu sezon için istatistik yok.</div>
      )}

      <section className="card">
        <div className="section-title">Bilgiler</div>
        <dl className="facts">
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </section>
      <p className="foot-note">{lg?.name} · Veri: ESPN{p.photo?.includes("wikimedia") ? " · Fotoğraf: Wikimedia Commons" : ""}</p>
    </>
  );
}
