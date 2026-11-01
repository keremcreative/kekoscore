import Link from "next/link";
import type { StandingRow } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

export function StandingsTable({ rows, league, highlight }: { rows: StandingRow[]; league: string; highlight?: string }) {
  return (
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
          <tr key={r.team.id + r.rank} title={r.note} className={r.team.id === highlight ? "hl" : ""}>
            <td>
              <span className={r.note ? "rank noted" : "rank"}>{r.rank}</span>
            </td>
            <td className="t">
              <Link href={`/takim/${league}/${r.team.id}`}>
                <TeamLogo team={r.team} size={18} />
                <span>{r.team.short}</span>
              </Link>
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
  );
}
