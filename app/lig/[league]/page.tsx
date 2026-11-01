import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamLogo } from "@/components/TeamLogo";
import { getStandings } from "@/lib/data";
import { leagueByCode } from "@/lib/leagues";
import type { StandingRow } from "@/lib/types";

export const revalidate = 300;

export default async function LeaguePage({ params }: { params: Promise<{ league: string }> }) {
  const { league: code } = await params;
  const league = leagueByCode(code);
  if (!league) notFound();

  let rows: StandingRow[] = [];
  let error = false;
  try {
    rows = await getStandings(code);
  } catch {
    error = true;
  }

  return (
    <>
      <Link href="/lig" className="back">‹ Ligler</Link>
      <h1 className="page-title">
        {league.flag} {league.name}
      </h1>
      <div className="card">
        {error && <p className="notice error">Puan durumu yüklenemedi.</p>}
        {!error && rows.length === 0 && <p className="empty">Bu turnuva için puan durumu yok.</p>}
        {rows.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th style={{ textAlign: "left" }}>Takım</th>
                <th>O</th>
                <th className="wide">G</th>
                <th className="wide">B</th>
                <th className="wide">M</th>
                <th>AV</th>
                <th>P</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.team.id + r.rank} title={r.note}>
                  <td>{r.rank}</td>
                  <td className="t">
                    <div>
                      <TeamLogo team={r.team} size={18} />
                      <span>{r.team.short}</span>
                    </div>
                  </td>
                  <td>{r.played}</td>
                  <td className="wide">{r.won}</td>
                  <td className="wide">{r.drawn}</td>
                  <td className="wide">{r.lost}</td>
                  <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                  <td className="pts">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
