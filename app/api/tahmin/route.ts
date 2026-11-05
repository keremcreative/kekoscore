import { createClient } from "@supabase/supabase-js";
import { getMatch, getScoreboardRange } from "@/lib/data";
import { leagueByCode } from "@/lib/leagues";
import { points, type Leaderboard, type LeaderRow, type SettledMatch } from "@/lib/predict";
import type { Match } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const admin = () => createClient(URL_!, SECRET!, { auth: { persistSession: false, autoRefreshToken: false } });
const NOT_SET = () => Response.json({ error: "Tahmin oyunu henüz ayarlı değil" }, { status: 503 });

/**
 * Tahmin kaydet. Gövde: { league, matchId, home, away }. Yetki: Authorization: Bearer <oturum anahtarı>.
 * Maçın başlamadığını ESPN'den kontrol eder; başlama saatini veritabanına sunucu yazar.
 */
export async function POST(req: Request) {
  if (!URL_ || !SECRET) return NOT_SET();
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return new Response("Yetkisiz", { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { league?: string; matchId?: string; home?: number; away?: number };
  const ok = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 20;
  if (!b.league || !leagueByCode(b.league) || !b.matchId || !/^[\w.-]{1,60}$/.test(b.matchId) || !ok(b.home) || !ok(b.away)) {
    return new Response("Geçersiz tahmin", { status: 400 });
  }

  const sb = admin();
  const { data: u, error } = await sb.auth.getUser(token);
  if (error || !u.user) return new Response("Yetkisiz", { status: 401 });

  const m = await getMatch(b.league, b.matchId).catch(() => null);
  if (!m) return new Response("Maç bulunamadı", { status: 404 });
  if (m.state !== "pre" || new Date(m.date).getTime() <= Date.now()) {
    return Response.json({ error: "Maç başladı, tahminler kapandı" }, { status: 409 });
  }

  const { error: wErr } = await sb.from("predictions").upsert(
    { match_id: m.id, league: b.league, user_id: u.user.id, home: b.home, away: b.away, kickoff: m.date, updated_at: new Date().toISOString() },
    { onConflict: "match_id,user_id" },
  );
  if (wErr) return Response.json({ error: wErr.message }, { status: 500 });
  return Response.json({ saved: true });
}

const ymdUtc = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/** Puan durumu: başlamış maçların tahminlerini biten skorlarla karşılaştırır */
export async function GET() {
  if (!URL_ || !SECRET) return NOT_SET();
  const sb = admin();
  const since = new Date(Date.now() - 120 * 86400000).toISOString();
  const [{ data: preds, error }, { data: profiles }] = await Promise.all([
    sb.from("predictions").select("match_id, league, user_id, home, away, kickoff").lte("kickoff", new Date().toISOString()).gte("kickoff", since),
    sb.from("profiles").select("id, username"),
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const name = new Map((profiles ?? []).map((p) => [p.id as string, p.username as string]));

  // Sonuçları lig + gün grupları halinde çek (her grup için tek istek)
  const groups = new Map<string, { league: string; from: string; to: string }>();
  for (const p of preds ?? []) {
    const d = new Date(p.kickoff);
    const from = ymdUtc(new Date(d.getTime() - 86400000)), to = ymdUtc(new Date(d.getTime() + 86400000));
    groups.set(`${p.league}|${from}`, { league: p.league, from, to });
  }
  const results = new Map<string, Match>();
  await Promise.all(
    [...groups.values()].map(async (g) => {
      // Bitmiş günlerin sonuçları değişmez: 1 saat önbellekte kalsın (her puan tablosu açılışında yeniden yazılmasın)
      const old = g.to < ymdUtc(new Date(Date.now() - 2 * 86400000));
      const ms = await getScoreboardRange(g.league, g.from, g.to, old ? 3600 : 60).catch(() => [] as Match[]);
      for (const m of ms) results.set(`${g.league}|${m.id}`, m);
    }),
  );

  const table = new Map<string, LeaderRow>();
  for (const [id, username] of name) table.set(id, { username, points: 0, exact: 0, outcome: 0, played: 0 });
  const settled = new Map<string, SettledMatch>();
  for (const p of preds ?? []) {
    const m = results.get(`${p.league}|${p.match_id}`);
    if (!m || m.state !== "post") continue;
    const pts = points(p, { home: m.home.score, away: m.away.score });
    if (pts === null) continue;
    const row = table.get(p.user_id) ?? { username: name.get(p.user_id) ?? "?", points: 0, exact: 0, outcome: 0, played: 0 };
    row.points += pts;
    row.played += 1;
    if (pts === 3) row.exact += 1;
    else if (pts === 1) row.outcome += 1;
    table.set(p.user_id, row);
    const key = `${p.league}|${p.match_id}`;
    const s: SettledMatch = settled.get(key) ?? {
      id: m.id, league: p.league, date: m.date,
      home: { name: m.home.team.short, logo: m.home.team.logo, score: m.home.score! },
      away: { name: m.away.team.short, logo: m.away.team.logo, score: m.away.score! },
      picks: [],
    };
    s.picks.push({ username: row.username, home: p.home, away: p.away, points: pts });
    settled.set(key, s);
  }

  const body: Leaderboard = {
    rows: [...table.values()].filter((r) => r.played > 0).sort((a, b) => b.points - a.points || b.exact - a.exact || a.username.localeCompare(b.username)),
    recent: [...settled.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15).map((s) => ({ ...s, picks: s.picks.sort((a, b) => b.points - a.points) })),
  };
  return Response.json(body, { headers: { "cache-control": "no-store" } });
}
