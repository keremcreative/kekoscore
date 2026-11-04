"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { compareLeagues } from "@/lib/leagues";
import { points } from "@/lib/predict";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { Match, MatchState, Team } from "@/lib/types";
import { useSession } from "./useSession";
import { LeagueSection } from "../LeagueSection";

export interface Score {
  home: number;
  away: number;
}

async function save(league: string, matchId: string, s: Score): Promise<string | null> {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return "Önce giriş yap";
  const res = await fetch("/api/tahmin", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ league, matchId, ...s }),
  });
  if (res.ok) return null;
  const j = await res.json().catch(() => null);
  return j?.error ?? "Kaydedilemedi";
}

function Stepper({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <span className="stepper">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={disabled || value === 0} aria-label="Azalt">−</button>
      <b>{value}</b>
      <button type="button" onClick={() => onChange(Math.min(20, value + 1))} disabled={disabled} aria-label="Artır">+</button>
    </span>
  );
}

/** Tek maç için tahmin girişi (kaydedilen tahmin + düzenleme) */
function PredictInput({ league, matchId, saved, onSaved, compact }: { league: string; matchId: string; saved?: Score; onSaved: (s: Score) => void; compact?: boolean }) {
  const [v, setV] = useState<Score>(saved ?? { home: 0, away: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (saved) setV(saved);
  }, [saved]);
  const dirty = !saved || saved.home !== v.home || saved.away !== v.away;
  async function submit() {
    setBusy(true);
    setErr(null);
    const e = await save(league, matchId, v);
    setBusy(false);
    if (e) setErr(e);
    else onSaved(v);
  }
  return (
    <div className={`pred-input${compact ? " compact" : ""}`}>
      <Stepper value={v.home} onChange={(home) => setV({ ...v, home })} disabled={busy} />
      <span className="pred-dash">–</span>
      <Stepper value={v.away} onChange={(away) => setV({ ...v, away })} disabled={busy} />
      <button type="button" className={`pred-save${dirty ? "" : " done"}`} onClick={submit} disabled={busy || !dirty}>
        {busy ? "…" : dirty ? (compact ? "✓" : saved ? "Güncelle" : "Kaydet") : "✓"}
      </button>
      {err && <span className="pred-err">{err}</span>}
    </div>
  );
}

interface Pick extends Score {
  user_id: string;
  username: string;
}

/** Maç sayfasındaki tahmin kartı */
export function PredictionCard({ league, matchId, state, home, away, score }: { league: string; matchId: string; state: MatchState; home: Team; away: Team; score?: { home?: number; away?: number } }) {
  if (!supabaseConfigured) return null;
  return <PredictionCardInner league={league} matchId={matchId} state={state} home={home} away={away} score={score} />;
}

function PredictionCardInner({ league, matchId, state, home, away, score }: { league: string; matchId: string; state: MatchState; home: Team; away: Team; score?: { home?: number; away?: number } }) {
  const { session, me, loading } = useSession();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase().from("predictions").select("user_id, home, away, profiles(username)").eq("match_id", matchId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setPicks((data ?? []).map((r: any) => ({ user_id: r.user_id, home: r.home, away: r.away, username: r.profiles?.username ?? "?" })));
    setReady(true);
  }, [matchId]);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  if (loading) return null;
  const mine = picks.find((p) => p.user_id === me?.id);
  const open = state === "pre";

  return (
    <section className="card poll pred-card">
      <div className="poll-head">
        <div>
          <h3>Skor tahmini</h3>
          <small>{open ? "Tam skor 3 puan, doğru sonuç 1 puan" : state === "in" ? "Maç başladı, tahminler kapandı" : "Maç bitti"}</small>
        </div>
        <Link href="/tahmin?sekme=puan" className="pred-link">Puan durumu ›</Link>
      </div>
      {!session ? (
        <Link href="/sohbet" className="btn">Tahmin yapmak için giriş yap</Link>
      ) : open ? (
        ready && (
          <>
            <div className="pred-teams">
              <span className="pred-team">{home.short}</span>
              <span className="pred-vs">vs</span>
              <span className="pred-team r">{away.short}</span>
            </div>
            <PredictInput league={league} matchId={matchId} saved={mine} onSaved={() => load()} />
          </>
        )
      ) : picks.length ? (
        <div className="pred-picks">
          {picks.map((p) => {
            const pts = state === "post" && score ? points(p, score) : null;
            return (
              <div key={p.user_id} className={`pred-pick${p.user_id === me?.id ? " me" : ""}`}>
                <span>{p.username}</span>
                <b>{p.home} – {p.away}</b>
                {pts !== null && <span className={`pts p${pts}`}>+{pts}</span>}
              </div>
            );
          })}
        </div>
      ) : (
        ready && <p className="empty" style={{ padding: "8px 0 4px" }}>Bu maça kimse tahmin yapmadı.</p>
      )}
    </section>
  );
}

export interface BoardMatch {
  league: string;
  leagueName: string;
  flag: string;
  logo?: { light?: string; dark?: string };
  day: string;
  time: string;
  match: Match;
}

/** /tahmin sayfası: yaklaşan maçlar listesi, tek seferde kendi tahminlerini yükler */
export const OPEN_COOKIE = "tahmin-acik";

export function PredictBoard({ items, open }: { items: BoardMatch[]; open: string[] }) {
  const { session, me, loading } = useSession();
  const [mine, setMine] = useState<Record<string, Score>>({});
  const ids = items.map((i) => i.match.id).join(",");

  useEffect(() => {
    if (!me || !ids) return;
    supabase()
      .from("predictions")
      .select("match_id, home, away")
      .eq("user_id", me.id)
      .in("match_id", ids.split(","))
      .then(({ data }) => setMine(Object.fromEntries((data ?? []).map((r) => [r.match_id, { home: r.home, away: r.away }]))));
  }, [me, ids]);

  if (!supabaseConfigured) return <div className="card empty">Tahmin oyunu için üyelik sistemi gerekli.</div>;
  if (loading) return <div className="card empty">Yükleniyor…</div>;
  if (!session) return <Link href="/sohbet" className="btn primary">Tahmin yapmak için giriş yap</Link>;
  if (!items.length) return <div className="card empty">Önümüzdeki günlerde tahmin yapılacak maç yok.</div>;

  const done = items.filter((i) => mine[i.match.id]).length;
  const groups: { league: string; name: string; flag: string; logo?: BoardMatch["logo"]; list: BoardMatch[] }[] = [];
  for (const i of items) {
    let g = groups.find((x) => x.league === i.league);
    if (!g) groups.push((g = { league: i.league, name: i.leagueName, flag: i.flag, logo: i.logo, list: [] }));
    g.list.push(i);
  }
  // Süper Lig, 5 büyük lig, sonra diğerleri A-Z
  groups.sort((a, b) => compareLeagues(a.league, b.league));
  return (
    <>
      <p className="pred-progress">{done}/{items.length} maça tahmin yaptın</p>
      {groups.map((g) => (
        <LeagueSection
          key={g.league}
          code={g.league}
          cookie={OPEN_COOKIE}
          storeOpen
          headToggles
          initiallyClosed={!open.includes(g.league)}
          head={
            <div className="card-head">
            {g.logo?.dark || g.logo?.light ? (
              <picture>
                {g.logo.dark && <source srcSet={g.logo.dark} />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.logo.light ?? g.logo.dark} alt="" width={20} height={20} />
              </picture>
            ) : (
              <span>{g.flag}</span>
            )}
            <span>{g.name}</span>
            <span className="more">{g.list.filter((i) => mine[i.match.id]).length}/{g.list.length}</span>
          </div>
          }
        >
          {g.list.map((i) => {
            const m = i.match;
            return (
              <div className={`pline${mine[m.id] ? " done" : ""}`} key={m.id}>
                <Link href={`/mac/${i.league}/${m.id}`} className="pline-time">
                  <small>{i.day}</small>
                  {i.time}
                </Link>
                <span className="pline-team" title={m.home.team.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.home.team.logo && <img src={m.home.team.logo} alt="" width={22} height={22} />}
                  <b>{m.home.team.abbr || m.home.team.short.slice(0, 3)}</b>
                </span>
                <PredictInput compact league={i.league} matchId={m.id} saved={mine[m.id]} onSaved={(s) => setMine((x) => ({ ...x, [m.id]: s }))} />
                <span className="pline-team r" title={m.away.team.name}>
                  <b>{m.away.team.abbr || m.away.team.short.slice(0, 3)}</b>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.away.team.logo && <img src={m.away.team.logo} alt="" width={22} height={22} />}
                </span>
              </div>
            );
          })}
        </LeagueSection>
      ))}
    </>
  );
}
