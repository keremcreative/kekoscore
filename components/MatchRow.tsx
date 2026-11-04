import Link from "next/link";
import type { Match, Side } from "@/lib/types";
import { kickoff, shortDate } from "@/lib/format";
import { resultFor } from "@/lib/teamStats";
import { ResultBadge } from "./Form";
import { TeamLogo } from "./TeamLogo";

function statusLabel(m: Match) {
  if (m.state === "in") return /^HT$|half/i.test(m.detail) ? "DA" : m.clock || m.detail || "Canlı";
  if (m.state === "post") return /pen|aet|uzt/i.test(m.detail) ? m.detail : "MS";
  if (/postp|ertel|cancel|iptal/i.test(m.detail)) return "Ertelendi";
  return kickoff(m.date);
}

/**
 * Tek maç satırı. `teamId` verilirse (takım sayfası) tarih ve o takımın
 * sonucu (G/B/M) gösterilir.
 */
export function MatchRow({ m, teamId, showDate, dayTag }: { m: Match; teamId?: string; showDate?: boolean; dayTag?: string }) {
  const live = m.state === "in";
  const pre = m.state === "pre";
  // Beraberlikte kimse "kaybeden" olarak soluklaşmasın
  const done = m.state === "post" && (m.home.winner || m.away.winner) === true;
  const r = teamId ? resultFor(m, teamId) : undefined;
  const cls = (s: Side) => `side${s.winner ? " win" : ""}${done && s.winner === false ? " dim" : ""}${s.team.id === teamId ? " me" : ""}`;
  return (
    <Link href={`/mac/${m.league}/${m.id}`} className={`match${live ? " is-live" : ""}`}>
      <span className={`status${live ? " live" : ""}`}>
        {showDate && !live && <span className="status-date">{shortDate(m.date)}</span>}
        {!showDate && dayTag && !live && <span className="status-date">{dayTag}</span>}
        {statusLabel(m)}
      </span>
      <span className={`${cls(m.home)} home`}>
        <span className="team-name">{m.home.team.short}</span>
        <TeamLogo team={m.home.team} size={18} />
      </span>
      <span className={`sc${pre ? " pre" : ""}`}>{pre ? "-" : `${m.home.score ?? 0} - ${m.away.score ?? 0}`}</span>
      <span className={`${cls(m.away)} away`}>
        <TeamLogo team={m.away.team} size={18} />
        <span className="team-name">{m.away.team.short}</span>
      </span>
      {r && <ResultBadge r={r} />}
    </Link>
  );
}
