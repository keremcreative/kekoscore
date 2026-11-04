import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

/** Sunucu tarafı bildirim yardımcıları (yalnızca API rotalarından kullanılır) */

export interface Sub {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

export interface Prefs {
  chat: boolean;
  big_tr: boolean;
  big_eu: boolean;
  fav: boolean;
}
export const DEFAULT_PREFS: Prefs = { chat: true, big_tr: true, big_eu: true, fav: true };

export interface Payload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export function admin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return null;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:kekoscore@example.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Kullanıcı tercihleri; tablo henüz yoksa ya da satır yoksa hepsi açık sayılır */
export async function loadPrefs(sb: SupabaseClient, userIds: string[]): Promise<Map<string, Prefs>> {
  const out = new Map<string, Prefs>(userIds.map((u) => [u, { ...DEFAULT_PREFS }]));
  if (!userIds.length) return out;
  const { data, error } = await sb.from("notif_prefs").select("user_id, chat, big_tr, big_eu, fav").in("user_id", userIds);
  if (error) return out;
  for (const r of data ?? []) out.set(r.user_id, { chat: r.chat, big_tr: r.big_tr, big_eu: r.big_eu, fav: r.fav });
  return out;
}

/**
 * Bildirimleri bir kez göndermek için anahtarları sahiplen: yalnızca ilk kez görülenler döner.
 * Cron her dakika çalıştığı ve iki çağrı üst üste binebildiği için kayıt veritabanında tutulur.
 */
export async function claim(sb: SupabaseClient, keys: string[]): Promise<Set<string> | null> {
  if (!keys.length) return new Set();
  const { data, error } = await sb
    .from("notice_log")
    .upsert(keys.map((key) => ({ key })), { onConflict: "key", ignoreDuplicates: true })
    .select("key");
  if (error) return null; // tablo yok (hatirlatma.sql çalıştırılmamış)
  return new Set((data ?? []).map((r) => r.key as string));
}

/** Aboneliklere gönderir, ölü abonelikleri siler; gönderilen sayısını döner */
export async function sendAll(sb: SupabaseClient, subs: Sub[], payload: Payload, ttl = 900): Promise<number> {
  const dead: string[] = [];
  const body = JSON.stringify(payload);
  const rs = await Promise.allSettled(
    subs.map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: ttl, urgency: "high" })
        .catch((e: { statusCode?: number }) => {
          if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(s.endpoint);
          throw e;
        }),
    ),
  );
  if (dead.length) await sb.from("push_subscriptions").delete().in("endpoint", dead);
  return rs.filter((r) => r.status === "fulfilled").length;
}
