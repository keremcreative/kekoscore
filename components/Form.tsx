import type { Result } from "@/lib/teamStats";

const LABEL: Record<Result, string> = { W: "G", D: "B", L: "M" };
const TITLE: Record<Result, string> = { W: "Galibiyet", D: "Beraberlik", L: "Mağlubiyet" };

export function ResultBadge({ r }: { r: Result }) {
  return (
    <span className={`res res-${r}`} title={TITLE[r]}>
      {LABEL[r]}
    </span>
  );
}

/** Son maçların sonucu, soldan sağa eskiden yeniye */
export function Form({ results }: { results: Result[] }) {
  return (
    <span className="form">
      {[...results].reverse().map((r, i) => (
        <ResultBadge key={i} r={r} />
      ))}
    </span>
  );
}
