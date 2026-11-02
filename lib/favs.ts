/** Favoriler çerezde tutulur (sunucu sayfaları okuyabilsin diye); giriş yapınca hesaba da eşitlenir. */
export type FavKind = "team" | "player" | "league";
export interface Fav {
  kind: FavKind;
  ref: string;
}
export const FAV_COOKIE = "favs";
const CODE: Record<FavKind, string> = { team: "t", player: "p", league: "l" };
const KIND: Record<string, FavKind> = { t: "team", p: "player", l: "league" };

export const favKey = (f: Fav) => `${CODE[f.kind]}:${f.ref}`;

export function parseFavs(raw?: string): Fav[] {
  if (!raw) return [];
  let s = raw;
  try {
    s = decodeURIComponent(raw);
  } catch {}
  return s
    .split("|")
    .map((x) => {
      const i = x.indexOf(":");
      const kind = KIND[x.slice(0, i)];
      const ref = x.slice(i + 1);
      return kind && /^[\w.\-/]{1,80}$/.test(ref) ? { kind, ref } : null;
    })
    .filter((f): f is Fav => f !== null);
}

export const serializeFavs = (fs: Fav[]) => encodeURIComponent(fs.map(favKey).join("|"));
