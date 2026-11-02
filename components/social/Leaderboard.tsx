"use client";
import { useEffect, useState } from "react";
import type { Leaderboard as LB } from "@/lib/predict";
import { useSession } from "./useSession";

export function Leaderboard() {
  const { me } = useSession();
  const [data, setData] = useState<LB | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/tahmin")
      .then(async (r) => (r.ok ? setData(await r.json()) : setErr((await r.json().catch(() => null))?.error ?? "Puan durumu alınamadı")))
      .catch(() => setErr("Puan durumu alınamadı"));
  }, []);
  if (err) return <div className="card empty">{err}</div>;
  if (!data) return <div className="card empty">Yükleniyor…</div>;
  if (!data.rows.length) return <div className="card empty">Henüz sonuçlanan tahmin yok. İlk maçlar bitince puanlar burada.</div>;
  return (
    <>
      <section className="card">
        <table className="table lb">
          <thead>
            <tr><th>#</th><th className="team-col">Oyuncu</th><th title="Tahmin edilen maç">M</th><th title="Tam skor">TS</th><th title="Doğru sonuç">S</th><th>P</th></tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={r.username} className={r.username === me?.username ? "hl" : ""}>
                <td>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
                <td className="team-col">{r.username}</td>
                <td>{r.played}</td><td>{r.exact}</td><td>{r.outcome}</td>
                <td><b>{r.points}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="foot-note">TS: tam skor (3 puan) · S: doğru sonuç (1 puan)</p>
      {data.recent.length > 0 && <div className="section-title day-title">Son biten maçlar</div>}
      {data.recent.map((m) => (
        <section className="card pred-item" key={m.league + m.id}>
          <div className="pred-result">
            <span>{m.home.name}</span><b>{m.home.score} – {m.away.score}</b><span>{m.away.name}</span>
          </div>
          <div className="pred-picks">
            {m.picks.map((p) => (
              <div key={p.username} className={`pred-pick${p.username === me?.username ? " me" : ""}`}>
                <span>{p.username}</span><b>{p.home} – {p.away}</b><span className={`pts p${p.points}`}>+{p.points}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
