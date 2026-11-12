/**
 * ESPN'in herkese açık (resmi olmayan, anahtarsız) futbol uç noktaları.
 * Yanıtları uygulamanın kendi tiplerine çeviriyoruz; ESPN şekli değiştirirse
 * yalnızca bu dosyayı düzeltmek yeterli. Her alan isteğe bağlı okunur ki
 * eksik veri sayfayı çökertmesin.
 */
import { rateLineups } from "./rating";
import { kindFromText, minuteNum, momentum, trText, type Play } from "./momentum";
import type {
  EventKind,
  LineupPlayer,
  Lineup,
  Match,
  MatchDetail,
  MatchEvent,
  MatchStat,
  Player,
  PositionGroup,
  Side,
  StandingRow,
  Team,
  TeamInfo,
  TeamSchedule,
  LeagueLogo,
} from "./types";

const SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const STANDINGS = "https://site.api.espn.com/apis/v2/sports/soccer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;

/**
 * ESPN'e aynı anda en fazla bu kadar istek. ~170 lig birden istenince ESPN bazılarını
 * yavaşlatıp düşürüyordu; ana sayfadan rastgele ligler kayboluyordu.
 */
const MAX_PARALLEL = 24;
let active = 0;
const queue: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_PARALLEL) await new Promise<void>((r) => queue.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

/**
 * revalidate > 0: Vercel veri önbelleğine yazılır (her yenilemede bir "Runtime Cache Write").
 * revalidate = 0: önbelleğe yazılmaz. Sonucu zaten tek bir unstable_cache kaydında tutulan
 * toplu sorgular (ana sayfa, bant) ve dakikada bir çalışan bildirim taraması bunu kullanır;
 * yoksa her 20 sn'de lig başına ayrı ayrı yazma yapılıyordu ve ücretsiz kota doluyordu.
 */
const cacheOpt = (revalidate: number): RequestInit => (revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" });

/** ESPN'den en son alınan hata (ana sayfada "skorlar alınamadı" ekranında sebebi göstermek için) */
export const espnHealth = { lastError: "", lastErrorAt: 0, lastOkAt: 0 };
function noteError(e: unknown) {
  const err = e as { name?: string; message?: string; cause?: { code?: string } };
  espnHealth.lastError = err?.name === "TimeoutError" ? "zaman aşımı (8 sn)" : err?.cause?.code ?? err?.message?.slice(0, 80) ?? String(e);
  espnHealth.lastErrorAt = Date.now();
}

/**
 * ESPN "çok istek" (429) dönerse bir süre hiç istek gönderilmez; yoksa ESPN'in sınırı hiç kalkmıyor.
 * 403 burada sayılmaz: ESPN bazı sorgu biçimlerini (ör. tarih aralığı) kendiliğinden reddedebiliyor.
 */
const COOL_MS = 20_000;
let coolUntil = 0;

async function get(url: string, revalidate: number): Promise<J> {
  if (Date.now() < coolUntil) throw Object.assign(new Error("ESPN istek sınırı, bekleniyor"), { status: 429 });
  let last: unknown;
  // Zaman aşımı ya da 5xx'te bir kez daha dene
  for (let i = 0; i < 2; i++) {
    try {
      const res = await slot(() => fetch(url, { ...cacheOpt(revalidate), headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) }));
      if (res.ok) {
        const j = await res.json();
        espnHealth.lastOkAt = Date.now();
        return j;
      }
      last = Object.assign(new Error(`ESPN ${res.status}`), { status: res.status });
      noteError(last);
      if (res.status === 429) {
        coolUntil = Date.now() + COOL_MS;
        break;
      }
      if (res.status < 500) break;
    } catch (e) {
      last = e;
      noteError(e);
    }
  }
  throw last;
}

function team(t: J): Team {
  return {
    id: String(t?.id ?? ""),
    name: t?.displayName ?? t?.name ?? "?",
    short: t?.shortDisplayName ?? t?.displayName ?? t?.name ?? "?",
    abbr: t?.abbreviation ?? "",
    logo: t?.logo ?? t?.logos?.[0]?.href,
  };
}

function num(v: J): number | undefined {
  const n = typeof v === "object" && v !== null ? Number(v.value ?? v.displayValue) : Number(v);
  return v === undefined || v === null || v === "" || !Number.isFinite(n) ? undefined : n;
}

function side(c: J): Side {
  return { team: team(c?.team), score: num(c?.score), winner: c?.winner === true };
}

function toMatch(ev: J, league: string): Match {
  const comp = ev?.competitions?.[0] ?? ev;
  const status = comp?.status ?? ev?.status ?? {};
  const st = status?.type ?? {};
  const state: Match["state"] = st.state === "in" ? "in" : st.state === "post" ? "post" : "pre";
  const cs: J[] = comp?.competitors ?? [];
  const home = cs.find((c) => c.homeAway === "home") ?? cs[0];
  const away = cs.find((c) => c.homeAway === "away") ?? cs[1];
  const m: Match = {
    id: String(ev?.id ?? comp?.id),
    league: ev?.league?.slug ?? league,
    date: comp?.date ?? ev?.date,
    state,
    clock: state === "in" ? status?.displayClock : undefined,
    detail: st.shortDetail ?? st.detail ?? "",
    home: side(home),
    away: side(away),
  };
  const homeId = m.home.team.id;
  const goals = ((comp?.details ?? []) as J[])
    .filter((d) => d?.scoringPlay)
    .map((d) => ({
      side: (String(d?.team?.id) === homeId ? "home" : "away") as "home" | "away",
      player: d?.athletesInvolved?.[0]?.displayName ?? d?.athletesInvolved?.[0]?.shortName,
      minute: d?.clock?.displayValue,
      own: d?.ownGoal === true,
      pen: d?.penaltyKick === true,
    }));
  if (goals.length) m.goals = goals;
  // Bazı uç noktalar winner alanını vermiyor: skordan çıkar
  if (state === "post" && !m.home.winner && !m.away.winner && m.home.score !== undefined && m.away.score !== undefined) {
    m.home.winner = m.home.score > m.away.score;
    m.away.winner = m.away.score > m.home.score;
  }
  return m;
}

const events = (data: J, league: string): Match[] => (data?.events ?? []).map((e: J) => toMatch(e, league));

/**
 * ESPN'in önündeki CDN, aynı adrese bazen dakikalarca (hatta saatlerce) eski cevap veriyor: 12 Kasım'da biten
 * maçlar "14. dk canlı" ya da "başlamadı" olarak geliyordu. Adrese zamana bağlı bir parametre eklenince taze cevap
 * geliyor. Parametre `seconds` saniyede bir değişir (her istekte değil: ESPN'e gereksiz yük olmasın).
 */
const fresh = (seconds: number) => `&_t=${Math.floor(Date.now() / (seconds * 1000))}`;
/** Canlı sorgular (önbelleksiz) 10 sn'lik, kısa önbellekliler kendi süresi kadar, uzunlar parametresiz */
const bust = (revalidate: number) => (revalidate <= 0 ? fresh(10) : revalidate <= 120 ? fresh(revalidate) : "");

export async function scoreboard(league: string, yyyymmdd: string, revalidate = 20): Promise<Match[]> {
  return events(await get(`${SITE}/${league}/scoreboard?dates=${yyyymmdd}${bust(revalidate)}`, revalidate), league);
}

function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  const d = new Date(`${from.slice(0, 4)}-${from.slice(4, 6)}-${from.slice(6, 8)}T12:00:00Z`);
  const end = `${to.slice(0, 4)}-${to.slice(4, 6)}-${to.slice(6, 8)}`;
  while (d.toISOString().slice(0, 10) <= end && days.length < 15) {
    days.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

/** Günleri tek tek iste. Hepsi alınamazsa hata; bir kısmı alınamazsa eldekiler. */
async function scoreboardDays(league: string, days: string[], revalidate: number): Promise<Match[]> {
  const rs = await Promise.allSettled(days.map((x) => scoreboard(league, x, revalidate)));
  const bad = rs.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
  // Canlı listede (kısa aralık) bir gün eksikse yarım liste döndürme: maçlar sessizce kaybolmasın
  if (bad && (days.length <= 3 || rs.every((r) => r.status === "rejected"))) throw bad.reason;
  const seen = new Set<string>();
  return rs.flatMap((r) => (r.status === "fulfilled" ? r.value : [])).filter((m) => !seen.has(m.id) && !!seen.add(m.id));
}

/**
 * Tarih aralığındaki maçlar (YYYYMMDD-YYYYMMDD).
 * 3 güne kadar (ana sayfa, bant, bildirim taraması): günler tek tek istenir. Aralık sorgusu (dates=A-B)
 * güvenilir değil: bazen reddediliyor, bazen CDN'den eski cevap geliyor.
 * Daha uzun aralıklar (haftalık fikstür, tahmin): önce aralık sorgusu, olmazsa gün gün.
 */
export async function scoreboardRange(league: string, from: string, to: string, revalidate = 60): Promise<Match[]> {
  const days = daysBetween(from, to);
  if (days.length <= 3) return scoreboardDays(league, days, revalidate);
  try {
    return events(await get(`${SITE}/${league}/scoreboard?dates=${from}-${to}&limit=200${bust(revalidate)}`, revalidate), league);
  } catch (e) {
    // 429'da gün gün isteme: ESPN zaten "çok istek" diyor, isteği katlamak sınırı uzatır
    if ((e as { status?: number }).status === 429) throw e;
    return scoreboardDays(league, days, revalidate);
  }
}

/** Teşhis (/api/durum): bir adresin ESPN'den nasıl döndüğü */
export async function probe(path: string): Promise<{ url: string; status: number | string; ms: number; events?: number; pre?: number; live?: number; post?: number; age?: string | null; cache?: string | null }> {
  const url = `${SITE}/${path}`;
  const t = Date.now();
  try {
    const res = await fetch(url, { cache: "no-store", headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    const out = { url: path, status: res.status, ms: 0, age: res.headers.get("age"), cache: res.headers.get("x-cache") ?? res.headers.get("cache-control") };
    if (!res.ok) return { ...out, ms: Date.now() - t };
    const j = await res.json();
    const st = (j?.events ?? []).map((e: J) => e?.status?.type?.state ?? e?.competitions?.[0]?.status?.type?.state);
    return { ...out, ms: Date.now() - t, events: st.length, pre: st.filter((x: string) => x === "pre").length, live: st.filter((x: string) => x === "in").length, post: st.filter((x: string) => x === "post").length };
  } catch (e) {
    return { url: path, status: (e as Error)?.name ?? "hata", ms: Date.now() - t };
  }
}

function kindOf(e: J): EventKind {
  const t = `${e?.type?.type ?? ""} ${e?.type?.text ?? ""}`.toLowerCase();
  if (t.includes("own")) return "own-goal";
  if (t.includes("penalty") && (t.includes("goal") || e?.scoringPlay)) return "penalty";
  if (e?.scoringPlay || t.includes("goal")) return "goal";
  if (t.includes("red")) return "red";
  if (t.includes("yellow")) return "yellow";
  if (t.includes("substitution")) return "sub";
  return "other";
}

function posGroup(p: J): PositionGroup {
  const a = `${p?.abbreviation ?? ""} ${p?.name ?? ""} ${p?.displayName ?? ""}`.toLowerCase();
  if (/\bg\b|goal|keeper/.test(a)) return "G";
  if (/\bd\b|def|back|\bcb\b|\blb\b|\brb\b/.test(a)) return "D";
  if (/\bm\b|mid|\bcm\b|\bdm\b|\bam\b/.test(a)) return "M";
  if (/\bf\b|forw|strik|wing|\bst\b|\bcf\b|\blw\b|\brw\b/.test(a)) return "F";
  return "?";
}

function player(a: J, pos: J): Player {
  const ath = a?.athlete ?? a;
  return {
    id: String(ath?.id ?? ""),
    name: ath?.displayName ?? ath?.fullName ?? "?",
    number: a?.jersey ?? ath?.jersey,
    pos: posGroup(pos ?? ath?.position),
    posLabel: (pos ?? ath?.position)?.abbreviation,
    age: num(ath?.age),
    nationality: ath?.citizenship ?? ath?.birthPlace?.country,
    photo: ath?.headshot?.href ?? headshot(ath?.id),
    dob: typeof ath?.dateOfBirth === "string" ? ath.dateOfBirth.slice(0, 10) : undefined,
  };
}

/**
 * Tüm oyuncu fotoğrafları tek kaynaktan: ESPN'in aynı arka plansız, aynı kadrajlı vesikaları.
 * ESPN'de olmayan oyuncuda dosya 404 döner, ekranda baş harfler görünür.
 */
const headshot = (id?: string | number) => (id ? `https://a.espncdn.com/i/headshots/soccer/players/full/${id}.png` : undefined);

function statMap(list: J): Record<string, number> | undefined {
  if (!Array.isArray(list) || !list.length) return undefined;
  const out: Record<string, number> = {};
  for (const s of list) {
    const v = Number(s?.value ?? s?.displayValue);
    if (s?.name && Number.isFinite(v)) out[s.name] = v;
  }
  return out;
}

function lineups(data: J, homeId: string): Lineup[] {
  return (data?.rosters ?? [])
    .map((r: J): Lineup => {
      const players: LineupPlayer[] = (r?.roster ?? []).map((p: J) => ({
        ...player(p, p?.position),
        starter: p?.starter === true,
        subbedIn: p?.subbedIn === true || p?.subbedIn?.didSub === true,
        subbedOut: p?.subbedOut === true || p?.subbedOut?.didSub === true,
        stats: statMap(p?.stats),
      }));
      return {
        side: r?.homeAway === "home" || String(r?.team?.id) === homeId ? "home" : "away",
        formation: r?.formation,
        players,
      };
    })
    .filter((l: Lineup) => l.players.length);
}

function h2h(data: J, league: string, home: Team, away: Team): Match[] {
  const byId = new Map([[home.id, home], [away.id, away]]);
  const seen = new Set<string>();
  const out: Match[] = [];
  for (const g of data?.headToHeadGames ?? []) {
    for (const e of g?.events ?? []) {
      const id = String(e?.id ?? "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const hId = String(e?.homeTeamId ?? ""), aId = String(e?.awayTeamId ?? "");
      const ht = byId.get(hId), at = byId.get(aId);
      if (!ht || !at) continue;
      const hs = num(e?.homeTeamScore), as = num(e?.awayTeamScore);
      out.push({
        id,
        league,
        date: e?.gameDate ?? e?.date,
        state: "post",
        detail: "MS",
        home: { team: ht, score: hs, winner: hs !== undefined && as !== undefined && hs > as },
        away: { team: at, score: as, winner: hs !== undefined && as !== undefined && as > hs },
      });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
}

/**
 * revalidate varsayılan 0: maç sayfası her açılışta ESPN'den taze okunur. Önbellek "eskiyi göster,
 * arkada yenile" çalıştığı için az kullanıcıda uzun süre önceki skor gösterilebiliyordu.
 */
export async function matchDetail(league: string, id: string, revalidate = 0): Promise<MatchDetail> {
  const data = await get(`${SITE}/${league}/summary?event=${id}`, revalidate);
  const comp = data?.header?.competitions?.[0];
  const base = toMatch({ id, competitions: [comp] }, league);
  base.league = league;
  const homeId = base.home.team.id;

  const evs: MatchEvent[] = (data?.keyEvents ?? [])
    .map((e: J): MatchEvent => {
      const who = (e?.participants ?? []).map((p: J) => p?.athlete?.displayName).filter(Boolean);
      return {
        minute: e?.clock?.displayValue ?? "",
        kind: kindOf(e),
        side: String(e?.team?.id) === homeId ? "home" : "away",
        text: who.length ? who.join(" / ") : e?.text ?? e?.type?.text ?? "",
      };
    })
    .filter((e: MatchEvent) => e.kind !== "other" && e.minute);

  const teams: J[] = data?.boxscore?.teams ?? [];
  const h = teams.find((t) => String(t?.team?.id) === homeId) ?? teams[0];
  const a = teams.find((t) => t !== h) ?? teams[1];
  const stats: MatchStat[] = (h?.statistics ?? []).map((s: J) => ({
    label: s?.label ?? s?.name,
    home: s?.displayValue ?? "-",
    away: a?.statistics?.find((x: J) => x?.name === s?.name)?.displayValue ?? "-",
  }));

  // Canlı anlatım: takım bilgisi yoksa metindeki "(Takım adı)" ya da "Corner, Takım." kalıbından
  const names = (t: Team) => [t.name, t.short].filter(Boolean);
  const sideOf = (c: J, text: string): Play["side"] => {
    const tid = String(c?.play?.team?.id ?? c?.team?.id ?? "");
    if (tid) return tid === homeId ? "home" : tid === base.away.team.id ? "away" : undefined;
    const corner = text.match(/^Corner,\s*([^.]+)\./i)?.[1]?.trim();
    for (const [side, t] of [["home", base.home.team], ["away", base.away.team]] as const) {
      if (names(t).some((n) => text.includes(`(${n})`) || corner === n)) return side;
    }
    return undefined;
  };
  const plays: Play[] = (data?.commentary ?? [])
    .map((c: J): Play | null => {
      const text = String(c?.text ?? c?.play?.text ?? "").trim();
      if (!text) return null;
      const minute = String(c?.time?.displayValue ?? c?.play?.clock?.displayValue ?? "");
      return { minute, min: minuteNum(minute), kind: kindFromText(text, c?.play?.type?.text), side: sideOf(c, text), text: trText(text) };
    })
    .filter(Boolean) as Play[];
  plays.sort((a, b) => a.min - b.min);
  // Anlatım yoksa önemli olaylardan kısa bir akış
  const flow: Play[] = plays.length
    ? plays
    : evs.map((e) => ({ minute: e.minute, min: minuteNum(e.minute), kind: e.kind === "other" ? "other" : e.kind, side: e.side, text: e.text }));
  const nowMin = base.state === "in" ? minuteNum(base.clock ?? "") : undefined;

  return {
    ...base,
    venue: data?.gameInfo?.venue?.fullName,
    events: evs,
    plays: flow,
    momentum: momentum(flow, nowMin),
    stats,
    lineups: base.state === "pre" ? lineups(data, homeId) : rateLineups(lineups(data, homeId), base.home.score, base.away.score),
    h2h: h2h(data, league, base.home.team, base.away.team).filter((m) => m.id !== id),
  };
}

export async function standings(league: string): Promise<StandingRow[]> {
  const data = await get(`${STANDINGS}/${league}/standings`, 300);
  const groups: J[] = data?.children?.length ? data.children : [data];
  const entries: J[] = groups.flatMap((g) => g?.standings?.entries ?? []);
  const stat = (e: J, ...names: string[]) => {
    for (const n of names) {
      const s = e?.stats?.find((x: J) => x?.name === n || x?.type === n);
      if (s) return Number(s.value ?? s.displayValue) || 0;
    }
    return 0;
  };
  return entries
    .map((e, i) => ({
      rank: stat(e, "rank") || i + 1,
      team: team(e?.team),
      played: stat(e, "gamesPlayed"),
      won: stat(e, "wins"),
      drawn: stat(e, "ties", "draws"),
      lost: stat(e, "losses"),
      gd: stat(e, "pointDifferential", "goalDifference"),
      points: stat(e, "points"),
      note: e?.note?.description,
    }))
    .sort((x, y) => x.rank - y.rank);
}

export async function teamInfo(league: string, id: string): Promise<TeamInfo> {
  const data = await get(`${SITE}/${league}/teams/${id}`, 3600);
  const t = data?.team ?? {};
  return { team: team(t), venue: t?.venue?.fullName, standingSummary: t?.standingSummary };
}

/** Kulüp liglerinin takımlarının ayrıca oynadığı kupalar (ESPN takım kimlikleri bütün turnuvalarda aynı) */
const EURO_CUPS = ["uefa.champions", "uefa.europa", "uefa.europa.conf"];
const TEAM_CUPS: Record<string, string[]> = {
  "tur.1": EURO_CUPS,
  "eng.1": [...EURO_CUPS, "eng.fa", "eng.league_cup"],
  "esp.1": [...EURO_CUPS, "esp.copa_del_rey"],
  "ita.1": [...EURO_CUPS, "ita.coppa_italia"],
  "ger.1": [...EURO_CUPS, "ger.dfb_pokal"],
  "fra.1": [...EURO_CUPS, "fra.coupe_de_france"],
  "por.1": EURO_CUPS,
  "ned.1": EURO_CUPS,
  "bra.1": ["conmebol.libertadores"],
  "arg.1": ["conmebol.libertadores"],
};

export async function teamSchedule(league: string, id: string): Promise<TeamSchedule> {
  const [past, next] = await Promise.allSettled([
    get(`${SITE}/${league}/teams/${id}/schedule`, 120),
    get(`${SITE}/${league}/teams/${id}/schedule?fixture=true`, 600),
  ]);
  // Lig fikstürü ESPN'de yalnızca o ligin maçlarını veriyor: Avrupa kupası ve yerel kupa maçlarını ayrıca çek.
  // Takım o kupada yoksa istek boş/hata döner, sessizce atlanır.
  const cups = TEAM_CUPS[league] ?? [];
  const cupRs = await Promise.allSettled(
    cups.flatMap((c) => [
      get(`${SITE}/${c}/teams/${id}/schedule`, 600).then((d) => events(d, c)),
      get(`${SITE}/${c}/teams/${id}/schedule?fixture=true`, 1800).then((d) => events(d, c)),
    ]),
  );
  const all = new Map<string, Match>();
  for (const r of [past, next]) {
    if (r.status === "fulfilled") for (const m of events(r.value, league)) all.set(m.id, m);
  }
  if (past.status === "rejected" && next.status === "rejected") throw past.reason;
  // Kupa maçının bağlantısı kendi turnuvasına gitsin (maç sayfası özetini o ligden ister)
  for (const r of cupRs) if (r.status === "fulfilled") for (const m of r.value) if (!all.has(m.id)) all.set(m.id, m);
  const list = [...all.values()].filter((m) => m.date);
  return {
    past: list.filter((m) => m.state !== "pre").sort((a, b) => b.date.localeCompare(a.date)),
    upcoming: list.filter((m) => m.state === "pre").sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function roster(league: string, id: string): Promise<Player[]> {
  const data = await get(`${SITE}/${league}/teams/${id}/roster`, 3600);
  const raw: J[] = data?.athletes ?? [];
  // Bazen pozisyona göre gruplu ({ position, items }) geliyor
  const flat = raw.flatMap((x) => (Array.isArray(x?.items) ? x.items : [x]));
  return flat.map((a) => player(a, a?.position));
}

/** Lig logoları (açık ve koyu tema), scoreboard yanıtının "leagues" alanından */
export async function leagueLogo(league: string): Promise<LeagueLogo> {
  const data = await get(`${SITE}/${league}/scoreboard`, 86400);
  const logos: J[] = data?.leagues?.[0]?.logos ?? [];
  const has = (l: J, r: string) => (l?.rel ?? []).includes(r);
  return {
    light: (logos.find((l) => has(l, "default")) ?? logos[0])?.href,
    dark: (logos.find((l) => has(l, "dark")) ?? logos.find((l) => has(l, "default")) ?? logos[0])?.href,
  };
}

const ATH = "https://site.web.api.espn.com/apis/common/v3/sports/soccer";

/** Fit/inç ve libre değerlerini metrik birime çevir */
function metric(height?: string, weight?: string) {
  const h = height?.match(/(\d+)'\s*(\d+)?/);
  const w = weight?.match(/([\d.]+)\s*lbs/);
  return {
    height: h ? `${Math.round((Number(h[1]) * 12 + Number(h[2] ?? 0)) * 2.54)} cm` : height,
    weight: w ? `${Math.round(Number(w[1]) * 0.4536)} kg` : weight,
  };
}

export async function playerProfile(league: string, id: string): Promise<import("./types").PlayerProfile> {
  const [bioR, ovR] = await Promise.allSettled([
    get(`${ATH}/${league}/athletes/${id}`, 3600),
    get(`${ATH}/${league}/athletes/${id}/overview`, 600),
  ]);
  if (bioR.status === "rejected") throw bioR.reason;
  const a: J = bioR.value?.athlete ?? {};
  const ov: J = ovR.status === "fulfilled" ? ovR.value : {};
  const st: J = ov?.statistics ?? {};
  const { height, weight } = metric(a?.displayHeight, a?.displayWeight);
  // "17/6/2001" -> "2001-06-17"
  const d = String(a?.displayDOB ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const dob = d ? `${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}` : undefined;
  const name = a?.displayName ?? a?.fullName ?? "?";
  const photo = a?.headshot?.href ?? headshot(id);
  return {
    id: String(a?.id ?? id),
    league,
    name,
    number: a?.jersey,
    position: a?.position?.displayName,
    pos: posGroup(a?.position),
    age: num(a?.age),
    birth: dob ?? a?.displayDOB,
    height,
    weight,
    nationality: a?.citizenship,
    flag: a?.flag?.href,
    photo,
    teamColor: typeof a?.team?.color === "string" && /^[0-9a-f]{6}$/i.test(a.team.color) ? a.team.color : undefined,
    team: a?.team ? team(a.team) : undefined,
    summary: (a?.statsSummary?.statistics ?? []).map((s: J) => [s?.shortDisplayName ?? s?.displayName ?? s?.name, s?.displayValue ?? "-"]),
    stats: {
      labels: st?.labels ?? [],
      names: st?.names ?? [],
      splits: (st?.splits ?? []).map((s: J) => ({
        name: s?.displayName ?? "",
        teamId: s?.teamId ? String(s.teamId) : undefined,
        league: s?.leagueSlug,
        stats: (s?.stats ?? []).map(String),
      })),
    },
  };
}

const FEE_TR: Record<string, string> = { Loan: "Kiralık", "Free Transfer": "Bonservissiz", Free: "Bonservissiz", Undisclosed: "Bedeli açıklanmadı", "End of loan": "Kiralık dönüşü", "Loan Return": "Kiralık dönüşü" };

/** Ligdeki transferler (bu ve geçen sezon), yeniden eskiye */
export async function transfers(league: string): Promise<import("./types").Transfer[]> {
  const y = new Date().getUTCFullYear();
  const rs = await Promise.allSettled([y, y - 1].map((season) => get(`${SITE}/${league}/transactions?season=${season}&limit=300`, 3600)));
  if (rs.every((r) => r.status === "rejected")) throw (rs[0] as PromiseRejectedResult).reason;
  const seen = new Set<string>();
  return rs
    .flatMap((r) => (r.status === "fulfilled" ? r.value?.transactions ?? [] : []))
    .map((t: J) => {
      const raw = String(t?.displayAmount ?? t?.type ?? "");
      return {
        date: t?.date ?? "",
        player: t?.athlete?.displayName ?? "?",
        playerId: t?.athlete?.id ? String(t.athlete.id) : undefined,
        from: t?.from ? team(t.from) : undefined,
        to: t?.to ? team(t.to) : undefined,
        fee: FEE_TR[raw] ?? (raw || "—"),
      };
    })
    .filter((t: import("./types").Transfer) => {
      const k = `${t.player}|${t.date}`;
      return !seen.has(k) && !!seen.add(k);
    })
    .sort((a: import("./types").Transfer, b: import("./types").Transfer) => b.date.localeCompare(a.date));
}

/** Gol ve asist krallığı */
export async function leaders(league: string): Promise<import("./types").LeagueLeaders> {
  const data = await get(`${SITE}/${league}/statistics`, 1800);
  const cats: J[] = data?.stats ?? data?.statistics ?? [];
  const pick = (re: RegExp) => {
    const c = cats.find((x) => re.test(`${x?.name ?? ""} ${x?.displayName ?? ""}`));
    return (c?.leaders ?? []).slice(0, 20).map((l: J) => {
      const a = l?.athlete ?? {};
      const t = l?.team ?? a?.team;
      return {
        player: a?.displayName ?? a?.fullName ?? "?",
        playerId: a?.id ? String(a.id) : undefined,
        team: t ? team(t) : undefined,
        value: Number(l?.value ?? l?.displayValue) || 0,
      };
    });
  };
  return { goals: pick(/goal/i), assists: pick(/assist/i) };
}
