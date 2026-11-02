import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { getScoreboard } from "@/lib/data";
import { shiftDays, ymd } from "@/lib/format";
import type { Match } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const PUB = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIV = process.env.VAPID_PRIVATE_KEY;
const CRON = process.env.CRON_SECRET;

interface Sub {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

/**
 * Favori takım gol bildirimi. Supabase'deki zamanlayıcı (pg_cron) bunu dakikada bir çağırır.
 * Favori takımı olan ve bildirimi açık kullanıcıların maçlarını ESPN'den okur, skoru bir
 * önceki kontrolle (goal_state) karşılaştırır, golü atan takımı favorileyenlere bildirim yollar.
 */
async function run(req: Request) {
  if (!URL_ || !SECRET || !PUB || !PRIV || !CRON) return Response.json({ skipped: "ayarlı değil" });
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? new URL(req.url).searchParams.get("key");
  if (given !== CRON) return new Response("Yetkisiz", { status: 401 });

  const sb = createClient(URL_, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: favs } = await sb.from("favorites").select("user_id, ref").eq("kind", "team");
  if (!favs?.length) return Response.json({ checked: 0 });
  const { data: subsRaw } = await sb.from("push_subscriptions").select("endpoint, p256dh, auth, user_id").in("user_id", [...new Set(favs.map((f) => f.user_id))]);
  const subs = (subsRaw ?? []) as Sub[];
  if (!subs.length) return Response.json({ checked: 0 });
  const withSubs = new Set(subs.map((s) => s.user_id));
  const fans = new Map<string, Set<string>>(); // "lig/takımId" -> kullanıcılar
  for (const f of favs) {
    if (!withSubs.has(f.user_id)) continue;
    if (!fans.has(f.ref)) fans.set(f.ref, new Set());
    fans.get(f.ref)!.add(f.user_id);
  }
  const leagues = [...new Set([...fans.keys()].map((r) => r.slice(0, r.lastIndexOf("/"))))];

  // Dün + bugün (gece yarısını aşan maçlar için), yalnızca favori takımların maçları
  const now = new Date();
  const days = [ymd(shiftDays(now, -1)), ymd(now)];
  const rs = await Promise.allSettled(leagues.flatMap((l) => days.map((d) => getScoreboard(l, d).then((ms) => ms.map((m) => ({ ...m, league: l }))))));
  const seen = new Set<string>();
  const matches = rs
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((m) => !seen.has(m.id) && !!seen.add(m.id))
    .filter((m) => fans.has(`${m.league}/${m.home.team.id}`) || fans.has(`${m.league}/${m.away.team.id}`))
    .filter((m) => {
      const t = now.getTime() - new Date(m.date).getTime();
      // başlamasına 1 saatten az kalan, oynanan ya da son 4 saatte biten maçlar
      return m.state === "in" || (m.state === "pre" && t > -3600e3) || (m.state === "post" && t < 4 * 3600e3);
    });
  if (!matches.length) return Response.json({ checked: 0 });

  const { data: prevRows } = await sb.from("goal_state").select("match_id, home, away").in("match_id", matches.map((m) => m.id));
  const prev = new Map((prevRows ?? []).map((r) => [r.match_id as string, r as { home: number; away: number }]));

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:kekoscore@example.com", PUB, PRIV);
  const sends: Promise<unknown>[] = [];
  const dead: string[] = [];
  const updates: { match_id: string; home: number; away: number; updated_at: string }[] = [];
  let goals = 0;

  for (const m of matches) {
    const h = m.home.score ?? 0, a = m.away.score ?? 0;
    const p = prev.get(m.id);
    if (!p || p.home !== h || p.away !== a) updates.push({ match_id: m.id, home: h, away: a, updated_at: now.toISOString() });
    // İlk kez görülen maçta bildirim yok (kurulumda eski goller için bildirim yağmasın)
    if (!p || m.state === "pre") continue;
    const scorers: Match["home"][] = [];
    if (h > p.home) scorers.push(m.home);
    if (a > p.away) scorers.push(m.away);
    for (const side of scorers) {
      const users = fans.get(`${m.league}/${side.team.id}`);
      if (!users?.size) continue;
      goals++;
      const payload = JSON.stringify({
        title: `⚽ GOL! ${side.team.short}`,
        body: `${m.home.team.short} ${h}-${a} ${m.away.team.short}${m.clock ? ` · ${m.clock}` : ""}`,
        url: `/mac/${m.league}/${m.id}`,
        tag: `gol-${m.id}-${h}-${a}`,
      });
      for (const s of subs.filter((x) => users.has(x.user_id))) {
        sends.push(
          webpush
            .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 600, urgency: "high" })
            .catch((e: { statusCode?: number }) => {
              if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(s.endpoint);
            }),
        );
      }
    }
  }

  await Promise.all(sends);
  if (updates.length) await sb.from("goal_state").upsert(updates, { onConflict: "match_id" });
  if (dead.length) await sb.from("push_subscriptions").delete().in("endpoint", dead);
  return Response.json({ checked: matches.length, goals, sent: sends.length - dead.length });
}

export const GET = run;
export const POST = run;
