import { getScoreboardRange } from "@/lib/data";
import { shiftDays, ymd } from "@/lib/format";
import { LEAGUES, leagueByCode } from "@/lib/leagues";
import { matchBigKind } from "@/lib/bigClubs";
import { admin, claim, DEFAULT_PREFS, loadPrefs, sendAll, type Payload, type Sub } from "@/lib/pushServer";
import type { Match } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Hatırlatma, maçın başlamasına bu kadar dakika kala gider */
const REMIND_MIN = 30;

/**
 * Büyük kulüp taraması yapılan ligler: ana ligler, Avrupa kupaları ve büyük ülkelerin kupaları.
 * Büyük kulüpler başka yerde oynamıyor; ESPN'e gereksiz istek gidip tarama 30 sn'yi aşmasın.
 * Favori takımların ligleri ayrıca eklenir.
 */
const SCAN = LEAGUES.filter((l) => l.group !== "Kadınlar" && (l.tier === 1 || (l.tier === 2 && l.group === "Kupalar"))).map((l) => l.code);

interface Job {
  key: string;
  users: Set<string>;
  payload: Payload;
}

/**
 * Supabase'deki zamanlayıcı (pg_cron) bunu dakikada bir çağırır. Gönderdikleri:
 *  - Büyük kulüplerin (Türk büyükleri / Avrupa devleri) ve favori takımların maçlarından 30 dk önce hatırlatma
 *  - Favori takım: maç başladı, gol, maç sonu
 * Her kullanıcı Ayarlar > Bildirimler'den hangilerini istediğini seçer.
 */
async function run(req: Request) {
  const CRON = process.env.CRON_SECRET;
  const sb = admin();
  if (!sb || !CRON) return Response.json({ skipped: "ayarlı değil" });
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? new URL(req.url).searchParams.get("key");
  if (given !== CRON) return new Response("Yetkisiz", { status: 401 });

  const { data: subsRaw } = await sb.from("push_subscriptions").select("endpoint, p256dh, auth, user_id");
  // Giriş yapmamış cihazların user_id'si boş: her birini ayrı "anon:" kullanıcı say (varsayılan tercihler)
  const subs = ((subsRaw ?? []) as (Omit<Sub, "user_id"> & { user_id: string | null })[]).map((s) => ({ ...s, user_id: s.user_id ?? `anon:${s.endpoint}` }));
  if (!subs.length) return Response.json({ checked: 0 });
  const userIds = [...new Set(subs.map((s) => s.user_id))];
  const realIds = userIds.filter((u) => !u.startsWith("anon:"));
  const [realPrefs, { data: favs }] = await Promise.all([
    loadPrefs(sb, realIds),
    realIds.length ? sb.from("favorites").select("user_id, ref").eq("kind", "team").in("user_id", realIds) : Promise.resolve({ data: [] as { user_id: string; ref: string }[] }),
  ]);
  const prefs = new Map(userIds.map((u) => [u, realPrefs.get(u) ?? { ...DEFAULT_PREFS }]));

  const fans = new Map<string, Set<string>>(); // "lig/takımId" -> kullanıcılar
  for (const f of favs ?? []) {
    if (!prefs.get(f.user_id)?.fav) continue;
    if (!fans.has(f.ref)) fans.set(f.ref, new Set());
    fans.get(f.ref)!.add(f.user_id);
  }
  const bigTr = new Set(userIds.filter((u) => prefs.get(u)?.big_tr));
  const bigEu = new Set(userIds.filter((u) => prefs.get(u)?.big_eu));
  const favLeagues = [...fans.keys()].map((r) => r.slice(0, r.lastIndexOf("/")));
  const leagues = [...new Set([...SCAN, ...favLeagues])];

  // Dün, bugün, yarın (Türkiye ve ABD günlerinin hepsini kapsasın)
  const now = new Date();
  const t = now.getTime();
  const rs = await Promise.allSettled(
    leagues.map((l) => getScoreboardRange(l, ymd(shiftDays(now, -1)), ymd(shiftDays(now, 1)), 30).then((ms) => ms.map((m) => ({ ...m, league: l })))),
  );
  const seen = new Set<string>();
  const matches = rs
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((m) => !seen.has(m.id) && !!seen.add(m.id))
    .filter((m) => {
      const dt = t - new Date(m.date).getTime();
      return (m.state === "pre" && dt > -(REMIND_MIN + 2) * 60e3) || m.state === "in" || (m.state === "post" && dt < 5 * 3600e3);
    });
  if (!matches.length) return Response.json({ checked: 0 });

  const fanOf = (m: Match) => new Set([...(fans.get(`${m.league}/${m.home.team.id}`) ?? []), ...(fans.get(`${m.league}/${m.away.team.id}`) ?? [])]);
  const title = (m: Match) => `${m.home.team.short} - ${m.away.team.short}`;
  const score = (m: Match) => `${m.home.team.short} ${m.home.score ?? 0}-${m.away.score ?? 0} ${m.away.team.short}`;
  const url = (m: Match) => `/mac/${m.league}/${m.id}`;
  const lgName = (m: Match) => leagueByCode(m.league)?.name ?? "";

  // Gol takibi için son görülen skorlar
  const tracked = matches.filter((m) => m.state !== "pre" && fanOf(m).size);
  const { data: prevRows } = tracked.length
    ? await sb.from("goal_state").select("match_id, home, away").in("match_id", tracked.map((m) => m.id))
    : { data: [] };
  const prev = new Map((prevRows ?? []).map((r) => [r.match_id as string, r as { home: number; away: number }]));
  const updates: { match_id: string; home: number; away: number; updated_at: string }[] = [];

  const jobs: Job[] = [];
  for (const m of matches) {
    const fansHere = fanOf(m);
    const women = leagueByCode(m.league)?.group === "Kadınlar";
    const big = women ? undefined : matchBigKind(m);
    const mins = (new Date(m.date).getTime() - t) / 60e3;

    // 1) 30 dk kala hatırlatma: büyük kulüpler + favori takımlar
    if (m.state === "pre" && mins > 0 && mins <= REMIND_MIN + 1 && !/postp|ertel|cancel|iptal/i.test(m.detail)) {
      const users = new Set(fansHere);
      if (big === "tr") bigTr.forEach((u) => users.add(u));
      if (big === "eu") bigEu.forEach((u) => users.add(u));
      if (users.size) {
        const left = Math.max(1, Math.round(mins));
        jobs.push({
          key: `hat-${m.id}`,
          users,
          payload: { title: `⏰ ${title(m)}`, body: `${lgName(m)} · ${left} dk sonra başlıyor`, url: url(m), tag: `hat-${m.id}` },
        });
      }
    }
    if (!fansHere.size) continue;

    // 2) Favori takımın maçı başladı (yalnızca ilk 25 dakikada; sonradan kurulumda eski maçlar için gitmesin)
    if (m.state === "in" && t - new Date(m.date).getTime() < 25 * 60e3) {
      jobs.push({ key: `bas-${m.id}`, users: fansHere, payload: { title: `🟢 Başladı: ${title(m)}`, body: lgName(m), url: url(m), tag: `bas-${m.id}` } });
    }

    // 3) Gol: skor bir önceki kontrolden farklıysa golü atan takımın taraftarlarına
    if (m.state !== "pre") {
      const h = m.home.score ?? 0, a = m.away.score ?? 0;
      const p = prev.get(m.id);
      if (!p || p.home !== h || p.away !== a) updates.push({ match_id: m.id, home: h, away: a, updated_at: now.toISOString() });
      if (p) {
        for (const [side, up] of [[m.home, h > p.home], [m.away, a > p.away]] as const) {
          if (!up) continue;
          const users = fans.get(`${m.league}/${side.team.id}`);
          if (!users?.size) continue;
          // Golü atan: skorborddaki bu tarafın son golü
          const sideKey = side === m.home ? "home" : "away";
          const g = [...(m.goals ?? [])].reverse().find((x) => x.side === sideKey);
          const who = g?.player ? ` · ${g.player}${g.pen ? " (pen.)" : g.own ? " (k.k.)" : ""}${g.minute ? ` ${g.minute}` : ""}` : "";
          jobs.push({
            key: `gol-${m.id}-${h}-${a}`,
            users,
            payload: {
              title: `⚽ GOL! ${side.team.short}${who}`,
              body: `${score(m)}${!g?.minute && m.clock ? ` · ${m.clock}` : ""}`,
              url: url(m),
              tag: `gol-${m.id}-${h}-${a}`,
            },
          });
        }
      }
      // 4) Maç sonu (yalnızca canlıyken takip ettiğimiz maçlar için)
      if (m.state === "post" && p && t - new Date(m.date).getTime() < 3 * 3600e3) {
        jobs.push({ key: `ms-${m.id}`, users: fansHere, payload: { title: `🏁 Maç sonu: ${score(m)}`, body: lgName(m), url: url(m), tag: `ms-${m.id}` } });
      }
    }
  }

  if (updates.length) await sb.from("goal_state").upsert(updates, { onConflict: "match_id" });
  const claimed = await claim(sb, jobs.map((j) => j.key));
  // notice_log tablosu yoksa yalnızca goller gider (goal_state zaten tekrarı önlüyor)
  const won = claimed ?? new Set(jobs.filter((j) => j.key.startsWith("gol-")).map((j) => j.key));
  let sent = 0;
  await Promise.all(
    jobs
      .filter((j) => won.has(j.key))
      .map(async (j) => {
        sent += await sendAll(sb, subs.filter((s) => j.users.has(s.user_id)), j.payload);
      }),
  );
  return Response.json({ checked: matches.length, jobs: jobs.length, claimed: won.size, sent });
}

export const GET = run;
export const POST = run;
