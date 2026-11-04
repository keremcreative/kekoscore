import type { Play, PlayKind } from "@/lib/momentum";

const ICON: Partial<Record<PlayKind, string>> = {
  goal: "⚽", penalty: "⚽", "own-goal": "⚽", "shot-on": "🧤", shot: "↗", corner: "⛳", yellow: "🟨", red: "🟥", sub: "⇄", foul: "✋", offside: "🚩", period: "⏱",
};

/** Canlı anlatım: en yeni olay en üstte */
export function Commentary({ plays, home, away, limit }: { plays: Play[]; home: string; away: string; limit?: number }) {
  const list = [...plays].reverse().slice(0, limit);
  if (!list.length) return <p className="empty">Anlatım maç başlayınca burada akacak.</p>;
  return (
    <ol className="comm">
      {list.map((p, i) => {
        const big = p.kind === "goal" || p.kind === "penalty" || p.kind === "own-goal";
        return (
          <li key={i} className={`comm-item k-${p.kind}${big ? " big" : ""}${p.side ? ` s-${p.side}` : ""}`}>
            <span className="comm-min">{p.minute}</span>
            <span className="comm-ico" aria-hidden>{ICON[p.kind] ?? "•"}</span>
            <span className="comm-text">
              {p.side && <small>{p.side === "home" ? home : away}</small>}
              {p.text}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
