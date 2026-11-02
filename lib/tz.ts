import { cache } from "react";

/** Kullanıcının seçtiği saat dilimi: tr = İstanbul, us = Massachusetts (ABD Doğu) */
export type TzKey = "tr" | "us";
export const TZS: Record<TzKey, string> = { tr: "Europe/Istanbul", us: "America/New_York" };
export const TZ_COOKIE = "tz";

// İstek başına tek değer (React cache sunucuda isteğe özeldir)
const store = cache(() => ({ key: "tr" as TzKey }));

export const currentTzKey = (): TzKey => store().key;
export const currentTz = (): string => TZS[store().key];

/** Sayfa ve layout'un en başında çağrılır: çerezden saat dilimini okur */
export async function initTz(): Promise<TzKey> {
  const { cookies } = await import("next/headers");
  const v = (await cookies()).get(TZ_COOKIE)?.value;
  store().key = v === "us" ? "us" : "tr";
  return store().key;
}
