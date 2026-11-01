import Link from "next/link";
import { dayLabel, shiftDays, ymd } from "@/lib/format";

export function DateNav({ selected, liveOnly }: { selected: Date; liveOnly: boolean }) {
  const today = ymd(new Date());
  const sel = ymd(selected);
  const days = [-1, 0, 1, 2, 3].map((n) => shiftDays(selected, n));
  return (
    <nav className="datenav" aria-label="Tarih">
      <Link href={liveOnly ? (sel === today ? "/" : `/?d=${sel}`) : `/?d=${sel}&canli=1`} className={`live-toggle${liveOnly ? " on" : ""}`}>
        ● Canlı
      </Link>
      {days.map((d) => {
        const key = ymd(d);
        const label = key === today ? "Bugün" : dayLabel(d);
        return (
          <Link key={key} href={key === today ? "/" : `/?d=${key}`} className={key === sel ? "on" : ""} scroll={false}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
