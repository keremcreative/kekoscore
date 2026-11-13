import { matchHighlights } from "@/lib/highlights";
import type { MatchDetail } from "@/lib/types";
import { Highlights } from "./Highlights";

/** Sunucuda özet videosunu arar; sayfanın geri kalanını bekletmemek için Suspense içinde kullanılır. */
export async function MatchHighlights({ league, m }: { league: string; m: MatchDetail }) {
  const items = await matchHighlights(league, m).catch(() => []);
  return <Highlights items={items} />;
}
