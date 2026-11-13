import { unstable_cache } from "next/cache";
import { memo } from "./memo";
import type { MatchDetail, Team } from "./types";

/**
 * Maç özet videoları: liglerin ve yayıncıların resmi YouTube kanallarının RSS akışından
 * (youtube.com/feeds/videos.xml, anahtarsız, kota yok) bulunur, takım adlarıyla maça eşlenir.
 * RSS her kanalın yalnızca son 15 videosunu verir; bulunan özet 30 gün önbellekte tutulur
 * (maç başına tek kayıt), bulunamayınca hiçbir şey yazılmaz. Akışlar sunucu belleğinde 10 dk tutulur.
 */

export interface Channel {
  id: string;
  name: string;
}

export interface Highlight {
  videoId: string;
  title: string;
  channel: string;
  published: string;
}

// Kanal kimlikleri vidiq / arşiv kayıtlarıyla doğrulandı (12 Kasım 2026). /api/ozet canlı durumu gösterir.
export const CHANNELS = {
  bein: { id: "UCPe9vNjHF1kEExT5kHwc7aw", name: "beIN SPORTS Türkiye" },
  premier: { id: "UCG5qGWdu8nIRZqJ_GgDwQ-w", name: "Premier League" },
  nbc: { id: "UCqZQlzSHbVJrwrn5XvzrzcA", name: "NBC Sports" },
  laliga: { id: "UCTv-XvfzLX3i4IGWAm4sbmA", name: "LALIGA" },
  seriea: { id: "UCBJeMCIeLQos7wacox4hmLQ", name: "Serie A" },
  bundesliga: { id: "UC6UL29enLNe4mqwTfAyeNuw", name: "Bundesliga" },
  ligue1: { id: "UCQsH5XtIc9hONE1BQjucM0g", name: "Ligue 1" },
  golazo: { id: "UCET00YnetHT7tOpu12v8jxg", name: "CBS Sports Golazo" },
  espnfc: { id: "UC6c1z7bA__85CIWZ_jpCK-Q", name: "ESPN FC" },
} satisfies Record<string, Channel>;

const C = CHANNELS;
/** Lig başına bakılacak kanallar, öncelik sırasıyla. Listede olmayan ligler ESPN FC'ye bakar. */
const BY_LEAGUE: Record<string, Channel[]> = {
  "tur.1": [C.bein],
  "eng.1": [C.premier, C.nbc],
  "esp.1": [C.laliga, C.espnfc],
  "ita.1": [C.seriea, C.golazo],
  "ger.1": [C.bundesliga, C.espnfc],
  "fra.1": [C.ligue1],
  "uefa.champions": [C.golazo],
  "uefa.europa": [C.golazo],
  "uefa.europa.conf": [C.golazo],
};

export const channelsFor = (league: string): Channel[] => BY_LEAGUE[league] ?? [C.espnfc];

// ---- RSS ----

export interface FeedEntry {
  videoId: string;
  title: string;
  published: string;
  short: boolean;
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

export function parseFeed(xml: string): FeedEntry[] {
  const out: FeedEntry[] = [];
  for (const [, e] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const videoId = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = e.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const published = e.match(/<published>([^<]+)<\/published>/)?.[1];
    const href = e.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/)?.[1] ?? "";
    if (!videoId || !title || !published) continue;
    out.push({ videoId, title: decode(title).trim(), published, short: href.includes("/shorts/") });
  }
  return out;
}

export function feed(channelId: string): Promise<FeedEntry[]> {
  return memo(`yt:${channelId}`, 10 * 60e3, async () => {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
      cache: "no-store", // Vercel önbelleğine yazma (kota)
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`YouTube ${res.status}`);
    return parseFeed(await res.text());
  });
}

// ---- Eşleştirme ----

export const norm = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ß/g, "ss")
    .replace(/[øö]/g, "o")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;

// Takım adındaki ek kısaltmalar: "Gaziantep FK" → "gaziantep", "1. FC Köln" → "koln"
const AFFIX = new Set("fc afc cf sc ac as ss ssc sk fk jk cd ud rc rcd sd ca club de sv vfb vfl tsg bv 1 04 05 09 1899 1846 1909".split(" "));
// Tek başına iki farklı takımı karıştırabilecek kelimeler
const COMMON = new Set(
  "united city real sporting athletic athletico atletico borussia manchester club deportivo olympique racing inter internacional union hotspur wanderers albion county town rovers football calcio stade hove".split(" "),
);
const ALIAS: Record<string, string[]> = {
  "manchester united": ["man utd", "man united", "manchester utd"],
  "manchester city": ["man city"],
  "tottenham hotspur": ["tottenham", "spurs"],
  "wolverhampton wanderers": ["wolves"],
  "nottingham forest": ["nottm forest", "forest"],
  "paris saint germain": ["psg", "paris sg"],
  internazionale: ["inter", "inter milan"],
  "ac milan": ["milan"],
  "atletico madrid": ["atletico", "atleti", "atletico de madrid"],
  "athletic club": ["athletic bilbao", "athletic"],
  "borussia monchengladbach": ["gladbach", "monchengladbach", "m gladbach"],
  "bayern munich": ["bayern", "bayern munchen", "fc bayern"],
  "borussia dortmund": ["dortmund", "bvb"],
  "bayer leverkusen": ["leverkusen"],
  "rb leipzig": ["leipzig"],
  "istanbul basaksehir": ["basaksehir", "rams basaksehir"],
  barcelona: ["barca"],
  "olympique marseille": ["marseille", "om"],
  "olympique lyonnais": ["lyon", "ol"],
};

export function aliases(t: Team): string[] {
  const set = new Set<string>();
  for (const raw of [t.name, t.short]) {
    if (!raw) continue;
    const n = norm(raw).trim();
    set.add(n);
    const stripped = n.split(" ").filter((w) => !AFFIX.has(w)).join(" ");
    if (stripped) set.add(stripped);
    for (const a of ALIAS[n] ?? ALIAS[stripped] ?? []) set.add(a);
    const longest = stripped.split(" ").filter((w) => !COMMON.has(w)).sort((a, b) => b.length - a.length)[0];
    if (longest && longest.length >= 6) set.add(longest);
  }
  return [...set].filter((a) => a.length >= 2);
}

const has = (title: string, team: string[]) => team.some((a) => title.includes(` ${a} `));
const GOOD = /\b(highlights?|ozet|ozeti|resumen|resume|sintesi|journee|extended|all goals|goals)\b/;
const BAD = /\b(press conference|preview|build up|reaction|interview|every angle|top moment|roportaj|basin toplantisi|analysis|analiz|reacts?|prediction|tahmin|live|canli|full match|tum mac)\b/;
const SCORE = / \d{1,2} \d{1,2} /; // "2-1", "(2-1)" norm sonrası " 2 1 "

/** Bir videonun bu maçın özeti olma puanı; 0 ya da altı = değil. */
export function scoreEntry(e: FeedEntry, m: Pick<MatchDetail, "date" | "home" | "away">, home: string[], away: string[]): number {
  if (e.short) return 0;
  const kick = new Date(m.date).getTime();
  const pub = new Date(e.published).getTime();
  // Maç başlamadan önce yüklenenler özet değildir; 4 günden sonrakiler büyük olasılıkla başka maç
  if (!(pub > kick + 45 * 60e3 && pub < kick + 4 * 86400e3)) return 0;
  const t = norm(e.title);
  if (!has(t, home) || !has(t, away)) return 0;
  if (BAD.test(t)) return 0;
  let s = 0;
  if (GOOD.test(t)) s += 3;
  if (SCORE.test(t)) s += 1;
  return s;
}

export async function findHighlights(league: string, m: Pick<MatchDetail, "date" | "home" | "away">): Promise<{ found: Highlight[]; complete: boolean }> {
  const home = aliases(m.home.team);
  const away = aliases(m.away.team);
  const chans = channelsFor(league);
  const results = await Promise.all(
    chans.map(async (ch) => {
      const entries = await feed(ch.id).catch(() => null);
      if (!entries) return { ok: false, best: undefined };
      let best: { e: FeedEntry; s: number } | undefined;
      for (const e of entries) {
        const s = scoreEntry(e, m, home, away);
        if (s > 0 && (!best || s > best.s)) best = { e, s };
      }
      return { ok: true, best: best && { videoId: best.e.videoId, title: best.e.title, channel: ch.name, published: best.e.published } };
    }),
  );
  const found = results.flatMap((r) => (r.best ? [r.best] : []));
  return { found, complete: results.every((r) => r.ok && r.best) };
}

const cached = unstable_cache(
  async (league: string, id: string, date: string, home: Team, away: Team): Promise<Highlight[]> => {
    const { found, complete } = await findHighlights(league, { date, home: { team: home }, away: { team: away } });
    // Bulunamadıysa önbelleğe yazma (sonraki açılışta yeniden bakılır). Maçtan sonraki ilk 12 saatte
    // bir kanal eksikse de yazma: diğer yayıncı özetini sonradan yükleyebilir.
    const settled = Date.now() - new Date(date).getTime() > 12 * 3600e3;
    if (!found.length || (!complete && !settled)) throw new NotYet(found);
    return found;
  },
  ["ozet-v1"],
  { revalidate: 30 * 86400 },
);

class NotYet extends Error {
  constructor(public found: Highlight[]) {
    super("ozet henuz yok");
  }
}

/** Biten maçın özet videoları (en fazla 2). Hata vermez; bulunamazsa boş döner. */
export function matchHighlights(league: string, m: MatchDetail): Promise<Highlight[]> {
  if (m.state !== "post") return Promise.resolve([]);
  const age = Date.now() - new Date(m.date).getTime();
  if (age > 7 * 86400e3) return Promise.resolve([]); // RSS bu kadar geriye gitmez
  return memo(`ozet:${league}:${m.id}`, 5 * 60e3, () =>
    cached(league, m.id, m.date, m.home.team, m.away.team).catch((e) => (e instanceof NotYet ? e.found : [])),
  ).then((v) => v.slice(0, 2));
}
