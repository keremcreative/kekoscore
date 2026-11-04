import type { MomentumPoint, Play } from "@/lib/momentum";

/**
 * Momentum grafiği: yukarı = ev sahibi baskısı, aşağı = deplasman baskısı.
 * Goller top simgesiyle, devre arası kesik çizgiyle işaretlenir.
 */
export function Momentum({
  points,
  plays = [],
  home,
  away,
  compact = false,
}: {
  points: MomentumPoint[];
  plays?: Play[];
  home?: string;
  away?: string;
  compact?: boolean;
}) {
  if (points.length < 5) return null;
  const end = Math.max(90, points.length);
  const W = 360, H = compact ? 40 : 96, mid = H / 2, amp = mid - (compact ? 2 : 10);
  const x = (min: number) => ((min - 0.5) / end) * W;
  const bw = Math.max(1.2, W / end - 1);
  const goals = plays.filter((p) => (p.kind === "goal" || p.kind === "penalty" || p.kind === "own-goal") && p.side);
  return (
    <div className={`momentum${compact ? " compact" : ""}`}>
      {!compact && (
        <div className="mom-legend">
          <span className="mh">{home}</span>
          <span>Momentum</span>
          <span className="ma">{away}</span>
        </div>
      )}
      <div className="mom-plot">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Maç momentumu">
        <line x1={x(45.5)} x2={x(45.5)} y1="0" y2={H} className="mom-ht" />
        {points.map((p) =>
          Math.abs(p.v) < 0.03 ? null : (
            <rect
              key={p.min}
              x={x(p.min) - bw / 2}
              width={bw}
              y={p.v > 0 ? mid - p.v * amp : mid}
              height={Math.abs(p.v) * amp}
              rx={Math.min(1.5, bw / 2)}
              className={p.v > 0 ? "mom-h" : "mom-a"}
            />
          ),
        )}
        <line x1="0" x2={W} y1={mid} y2={mid} className="mom-axis" />
      </svg>
      {!compact &&
        goals.map((g, i) => (
          <span key={i} className={`mom-goal ${g.side}`} style={{ left: `${(x(g.min) / W) * 100}%` }} title={`${g.minute} gol`}>
            ⚽
          </span>
        ))}
      </div>
      {!compact && (
        <div className="mom-axis-labels">
          <span>0&apos;</span>
          <span>45&apos;</span>
          <span>90&apos;</span>
        </div>
      )}
    </div>
  );
}
