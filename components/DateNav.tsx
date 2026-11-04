import Link from "next/link";
import { parseYmd, shiftDays, ymd } from "@/lib/format";

export type Filter = "hepsi" | "canli" | "biten";

export function DateNav({ selected, filter }: { selected: Date; filter: Filter }) {
  const today = ymd(new Date());
  const sel = ymd(selected);
  const base = parseYmd(sel); // gün ortası: her saat diliminde aynı tarih etiketi
  const days = [-2, -1, 0, 1, 2, 3].map((n) => shiftDays(base, n));
  const href = (day: string, f: Filter) => {
    const q = new URLSearchParams();
    if (day !== today) q.set("d", day);
    if (f !== "hepsi") q.set("durum", f);
    const s = q.toString();
    return s ? `/?${s}` : "/";
  };
  return (
    <nav className="datenav" aria-label="Tarih">
      <Link href={href(sel, filter === "canli" ? "hepsi" : "canli")} className={`live-toggle${filter === "canli" ? " on" : ""}`}>
        ● Canlı
      </Link>
      <Link href={href(sel, filter === "biten" ? "hepsi" : "biten")} className={`done-toggle${filter === "biten" ? " on" : ""}`}>
        Biten
      </Link>
      {days.map((d) => {
        const key = ymd(d);
        // "04.11" biçiminde; bugünün kutusu seçili değilken ince bir çerçeveyle belli olur
        const label = `${key.slice(6, 8)}.${key.slice(4, 6)}`;
        return (
          <Link key={key} href={href(key, filter)} className={[key === sel ? "on" : "", key === today ? "today" : ""].join(" ").trim() || undefined} scroll={false}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
