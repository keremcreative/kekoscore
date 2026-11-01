"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { MatchState, Team } from "@/lib/types";
import { useSession } from "./useSession";

type Pick = "home" | "draw" | "away";

/** "Kim kazanır?" anketi. Maç bitince oylama kapanır, sonuçlar kalır. */
export function Poll({ matchId, state, home, away }: { matchId: string; state: MatchState; home: Team; away: Team }) {
  if (!supabaseConfigured) return null;
  return <PollInner matchId={matchId} state={state} home={home} away={away} />;
}

function PollInner({ matchId, state, home, away }: { matchId: string; state: MatchState; home: Team; away: Team }) {
  const { session, me, loading } = useSession();
  const [counts, setCounts] = useState<Record<Pick, number>>({ home: 0, draw: 0, away: 0 });
  const [mine, setMine] = useState<Pick | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase().from("votes").select("user_id, pick").eq("match_id", matchId);
    const c = { home: 0, draw: 0, away: 0 };
    for (const v of data ?? []) c[v.pick as Pick]++;
    setCounts(c);
    if (me) setMine(((data ?? []).find((v) => v.user_id === me.id)?.pick as Pick) ?? null);
  }, [matchId, me]);

  useEffect(() => {
    if (!session) return;
    load();
    const sb = supabase();
    const ch = sb
      .channel(`votes:${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `match_id=eq.${matchId}` }, () => load())
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [session, matchId, load]);

  if (loading) return null;
  const closed = state === "post";
  const total = counts.home + counts.draw + counts.away;
  const showResults = closed || mine !== null;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  async function vote(pick: Pick) {
    if (closed || busy || !me) return;
    setBusy(true);
    setMine(pick);
    await supabase().from("votes").upsert({ match_id: matchId, user_id: me.id, pick }, { onConflict: "match_id,user_id" });
    await load();
    setBusy(false);
  }

  const options: { pick: Pick; label: React.ReactNode }[] = [
    { pick: "home", label: <TeamMark t={home} /> },
    { pick: "draw", label: <b>X</b> },
    { pick: "away", label: <TeamMark t={away} /> },
  ];

  return (
    <section className="card poll">
      <div className="poll-head">
        <div>
          <h3>Kim kazanır?</h3>
          <small>{total ? `${total} oy` : "Henüz oy yok"}{closed ? " · oylama kapandı" : ""}</small>
        </div>
        <span className="trophy" aria-hidden>🏆</span>
      </div>
      {!session ? (
        <Link href="/sohbet" className="btn">Oy vermek için giriş yap</Link>
      ) : (
        <div className="poll-opts">
          {options.map((o) => (
            <button
              key={o.pick}
              className={`opt${mine === o.pick ? " on" : ""}`}
              onClick={() => vote(o.pick)}
              disabled={closed || busy}
              style={showResults ? ({ "--p": `${pct(counts[o.pick])}%` } as React.CSSProperties) : undefined}
            >
              {o.label}
              {showResults && <span className="pct">{pct(counts[o.pick])}%</span>}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function TeamMark({ t }: { t: Team }) {
  return t.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={t.logo} alt={t.short} width={24} height={24} />
  ) : (
    <b>{t.abbr || t.short.slice(0, 3)}</b>
  );
}
