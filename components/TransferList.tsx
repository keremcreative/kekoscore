import Link from "next/link";
import type { Transfer } from "@/lib/types";
import { shortDate } from "@/lib/format";
import { TeamLogo } from "./TeamLogo";

/** Transfer satırları: oyuncu, nereden → nereye, bedel. teamId verilirse geliş/gidiş işareti */
export function TransferList({ items, league, teamId }: { items: Transfer[]; league: string; teamId?: string }) {
  return (
    <ul className="transfers">
      {items.map((t, i) => {
        const dir = teamId ? (t.to?.id === teamId ? "in" : "out") : undefined;
        const name = t.playerId ? <Link href={`/oyuncu/${league}/${t.playerId}`}>{t.player}</Link> : t.player;
        return (
          <li key={i} className={dir ? `tr-${dir}` : undefined}>
            {dir && <span className="tr-dir" aria-label={dir === "in" ? "Geldi" : "Gitti"}>{dir === "in" ? "↘" : "↗"}</span>}
            <span className="tr-main">
              <b>{name}</b>
              <span className="tr-route">
                {t.from ? <><TeamLogo team={t.from} size={14} /> {t.from.short}</> : "Serbest"}
                <span className="tr-arrow">→</span>
                {t.to ? <><TeamLogo team={t.to} size={14} /> {t.to.short}</> : "Serbest"}
              </span>
            </span>
            <span className="tr-side">
              <span className="tr-fee">{t.fee}</span>
              {t.date && <small>{shortDate(t.date)}</small>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
