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

function TeamLine({ s, done, me }: { s: Side; done: boolean; me: boolean }) {
  const dim = done && s.winner === false;
  return (
    <div className={`team-line${s.winner ? " win" : ""}${dim ? " dim" : ""}${me ? " me" : ""}`}>
      <TeamLogo team={s.team} />
      <span className="team-name">{s.team.short}</span>
      <span className="score">{s.score ?? ""}</span>
    </div>
  );
}

/**
 * Tek maç satırı. `teamId` verilirse (takım sayfası) tarih ve o takımın
 * sonucu (G/B/M) gösterilir.
 */
export function MatchRow({ m, teamId, showDate }: { m: Match; teamId?: string; showDate?: boolean }) {
  const live = m.state === "in";
  // Beraberlikte kimse "kaybeden" olarak soluklaşmasın
  const done = m.state === "post" && (m.home.winner || m.away.winner) === true;
  const r = teamId ? resultFor(m, teamId) : undefined;
  return (
    <Link href={`/mac/${m.league}/${m.id}`} className={`match${live ? " is-live" : ""}`}>
      <span className={`status${live ? " live" : ""}`}>
        {showDate && !live && <span className="status-date">{shortDate(m.date)}</span>}
        {statusLabel(m)}
      </span>
      <div className="teams">
        <TeamLine s={m.home} done={done} me={m.home.team.id === teamId} />
        <TeamLine s={m.away} done={done} me={m.away.team.id === teamId} />
      </div>
      {r && <ResultBadge r={r} />}
    </Link>
  );
}
