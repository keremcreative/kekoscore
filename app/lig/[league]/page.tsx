import { FavButton } from "@/components/social/FavButton";
import { initTz } from "@/lib/tz";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchRow } from "@/components/MatchRow";
import { StandingsTable } from "@/components/StandingsTable";
import { Tabs } from "@/components/Tabs";
import { LeagueIcon } from "@/components/LeagueIcon";
import { getLeagueLogo, getScoreboardRange, getStandings } from "@/lib/data";
import { fullDay, mondayOf, shiftDays, shortDate, ymd } from "@/lib/format";
import { leagueByCode } from "@/lib/leagues";
import type { Match, StandingRow } from "@/lib/types";

export const revalidate = 120;

const TABS = [
  { key: "puan", label: "Puan durumu" },
  { key: "fikstur", label: "Fikstür" },
];

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ sekme?: string; hafta?: string }>;
}) {
  await initTz();
  const { league: code } = await params;
  const sp = await searchParams;
  const tab = sp.sekme ?? "puan";
  const league = leagueByCode(code);
  if (!league) notFound();
  const base = `/lig/${code}`;
  const logo = await getLeagueLogo(code).catch(() => undefined);

  return (
    <>
      <Link href="/lig" className="back">‹ Ligler</Link>
      <h1 className="page-title with-logo">
        <LeagueIcon league={league} logo={logo} size={34} /> {league.name}
        <FavButton kind="league" refId={code} />
      </h1>
      <Tabs items={TABS} current={tab} base={base} />
      {tab === "fikstur" ? <Fixtures code={code} week={Number(sp.hafta) || 0} /> : <Table code={code} />}
    </>
  );
}

async function Table({ code }: { code: string }) {
  let rows: StandingRow[] = [];
  let error = false;
  try {
    rows = await getStandings(code);
  } catch {
    error = true;
  }
  const notes = [...new Set(rows.map((r) => r.note).filter(Boolean))];
  return (
    <div className="card">
      {error && <p className="notice error">Puan durumu yüklenemedi.</p>}
      {!error && rows.length === 0 && <p className="empty">Bu turnuva için puan durumu yok.</p>}
      {rows.length > 0 && <StandingsTable rows={rows} league={code} />}
      {notes.length > 0 && (
        <p className="legend">
          <span className="rank noted">•</span> {notes.join(" · ")}
        </p>
      )}
    </div>
  );
}

async function Fixtures({ code, week }: { code: string; week: number }) {
  const mon = shiftDays(mondayOf(new Date()), week * 7);
  const sun = shiftDays(mon, 6);
  let matches: Match[] = [];
  let error = false;
  try {
    matches = await getScoreboardRange(code, ymd(mon), ymd(sun));
  } catch {
    error = true;
  }
  const byDay = new Map<string, Match[]>();
  for (const m of [...matches].sort((a, b) => a.date.localeCompare(b.date))) {
    const k = ymd(new Date(m.date));
    byDay.set(k, [...(byDay.get(k) ?? []), m]);
  }
  const link = (w: number) => `/lig/${code}?sekme=fikstur${w ? `&hafta=${w}` : ""}`;
  return (
    <>
      <div className="weeknav">
        <Link href={link(week - 1)} replace scroll={false}>‹</Link>
        <span>
          {week === 0 ? "Bu hafta" : week === 1 ? "Gelecek hafta" : week === -1 ? "Geçen hafta" : ""} {shortDate(mon.toISOString())} – {shortDate(sun.toISOString())}
        </span>
        <Link href={link(week + 1)} replace scroll={false}>›</Link>
      </div>
      {error && <p className="notice error">Fikstür yüklenemedi.</p>}
      {!error && byDay.size === 0 && <p className="empty">Bu hafta maç yok.</p>}
      {[...byDay.entries()].map(([k, ms]) => (
        <section className="card" key={k}>
          <div className="section-title">{fullDay(new Date(ms[0].date))}</div>
          {ms.map((m) => (
            <MatchRow key={m.id} m={m} />
          ))}
        </section>
      ))}
    </>
  );
}
