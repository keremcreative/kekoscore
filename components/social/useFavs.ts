"use client";
import { useEffect, useSyncExternalStore } from "react";
import { FAV_COOKIE, favKey, parseFavs, serializeFavs, type Fav, type FavKind } from "@/lib/favs";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { useSession } from "./useSession";

let favs: Fav[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: Fav[] = [];

function read(): Fav[] {
  if (favs === null) {
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${FAV_COOKIE}=([^;]*)`));
    favs = parseFavs(m?.[1]);
  }
  return favs;
}
function write(next: Fav[]) {
  favs = next;
  document.cookie = `${FAV_COOKIE}=${serializeFavs(next)}; path=/; max-age=31536000; samesite=lax`;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

let syncedFor: string | null = null;

/** Favoriler: çerez + (giriş yapılmışsa) Supabase. Hesaptaki ve cihazdaki favoriler birleştirilir. */
export function useFavs() {
  const list = useSyncExternalStore(subscribe, read, () => EMPTY);
  const { me } = useSession();

  useEffect(() => {
    if (!supabaseConfigured || !me || syncedFor === me.id) return;
    syncedFor = me.id;
    (async () => {
      const sb = supabase();
      const { data, error } = await sb.from("favorites").select("kind, ref");
      if (error) return; // tablo henüz kurulmadıysa yalnızca cihazda kalır
      const remote = (data ?? []) as Fav[];
      const have = new Set(remote.map(favKey));
      const local = read();
      const missing = local.filter((f) => !have.has(favKey(f)));
      if (missing.length) await sb.from("favorites").upsert(missing.map((f) => ({ ...f, user_id: me.id })), { onConflict: "user_id,kind,ref", ignoreDuplicates: true });
      const seen = new Set(local.map(favKey));
      write([...local, ...remote.filter((f) => !seen.has(favKey(f)))]);
    })();
  }, [me]);

  const has = (kind: FavKind, ref: string) => list.some((f) => f.kind === kind && f.ref === ref);
  async function toggle(kind: FavKind, ref: string) {
    const on = has(kind, ref);
    write(on ? read().filter((f) => !(f.kind === kind && f.ref === ref)) : [...read(), { kind, ref }]);
    if (supabaseConfigured && me) {
      const t = supabase().from("favorites");
      if (on) await t.delete().match({ user_id: me.id, kind, ref });
      else await t.upsert({ user_id: me.id, kind, ref }, { onConflict: "user_id,kind,ref", ignoreDuplicates: true });
    }
    return !on;
  }
  return { list, has, toggle };
}
