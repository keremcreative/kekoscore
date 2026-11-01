import Link from "next/link";
import type { Match, Side } from "@/lib/types";
import { kickoff } from "@/lib/format";
import { TeamLogo } from "./TeamLogo";

function statusLabel(m: Match) {
  if (m.state === "in") return m.clock || m.detail || "Canlı";
  if (m.state === "post") return /pen|aet|uzt/i.test(m.detail) ? m.detail : "MS";
  if (/postp|ertel|cancel|iptal/i.test(m.detail)) return "Ertelendi";
  return kickoff(m.date);
}

function TeamLine({ s, done }: { s: Side; done: boolean }) {
  const dim = done && s.winner === false;
  return (
    <div className={`team-line${s.winner ? " win" : ""}${dim ? " dim" : ""}`}>
      <TeamLogo team={s.team} />
      <span className="team-name">{s.team.short}</span>
      <span className="score">{s.score ?? ""}</span>
    </div>
  );
}

export function MatchRow({ m }: { m: Match }) {
  const live = m.state === "in";
  // Beraberlikte kimse "kaybeden" olarak soluklaşmasın
  const done = m.state === "post" && (m.home.winner || m.away.winner) === true;
  return (
    <Link href={`/mac/${m.league}/${m.id}`} className={`match${live ? " is-live" : ""}`}>
      <span className={`status${live ? " live" : ""}`}>{statusLabel(m)}</span>
      <div className="teams">
        <TeamLine s={m.home} done={done} />
        <TeamLine s={m.away} done={done} />
      </div>
    </Link>
  );
}
