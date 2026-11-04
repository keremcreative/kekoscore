import { ratingClass } from "@/lib/rating";

/** Reyting kutucuğu: kırmızıdan koyu yeşile */
export function RatingBadge({ r, big }: { r?: number; big?: boolean }) {
  if (r === undefined) return null;
  return <span className={`rating ${ratingClass(r)}${big ? " big" : ""}`}>{r.toFixed(1)}</span>;
}
