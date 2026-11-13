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
  fox: { id: "UCooTLkxcpnTNx6vfOovfBFA", name: "FOX Soccer" }, // ABD: Uluslar Ligi, elemeler
  // Türkiye: Şampiyonlar Ligi / Avrupa kupaları ve milli maç özetleri. Kimliği bilinmediği için
  // kullanıcı adından (@trtspor) sunucuda çözülür.
  trt: { id: "@trtspor", name: "TRT SPOR" },
  tff: { id: "@tff", name: "TFF" }, // A Milli Takım maç özetleri
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
  "uefa.champions": [C.golazo, C.trt],
  "uefa.europa": [C.golazo, C.trt],
  "uefa.europa.conf": [C.golazo, C.trt],
};
/** Milli takım müsabakaları: TR'de TRT, ABD'de FOX / ESPN FC yayınlıyor */
const NATIONAL: Channel[] = [C.tff, C.trt, C.fox, C.espnfc];
const NATIONAL_CODES = /^(fifa\.|uefa\.(nations|euro|euroq)$|conmebol\.america|caf\.nations|concacaf\.)/;

export const channelsFor = (league: string): Channel[] =>
  BY_LEAGUE[league] ?? (NATIONAL_CODES.test(league) ? NATIONAL : [C.espnfc]);

// ---- RSS ----

export interface FeedEntry {
  videoId: string;
  title: string;
  published: string;
  short: boolean;
  /** Aramadan geldi: tarih yaklaşık ("3 days ago") */
  approx?: number;
  /** Aramadan geldi: videoyu yükleyen kanal */
  channelId?: string;
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

/** "@kullanici" → UC… kanal kimliği (kanal sayfasından, sunucu belleğinde 1 gün) */
export function resolveChannel(idOrHandle: string): Promise<string> {
  if (!idOrHandle.startsWith("@")) return Promise.resolve(idOrHandle);
  return memo(`yth:${idOrHandle}`, 86400e3, async () => {
    const res = await fetch(`https://www.youtube.com/${idOrHandle}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: BROWSER_HEADERS,
    });
    if (!res.ok) throw new Error(`YouTube ${res.status}`);
    const html = await res.text();
    const id =
      html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)?.[1] ??
      html.match(/"externalId":"(UC[\w-]{22})"/)?.[1] ??
      html.match(/"browseId":"(UC[\w-]{22})"/)?.[1];
    if (!id) throw new Error("kanal kimliği bulunamadı");
    return id;
  });
}

export function feed(idOrHandle: string): Promise<FeedEntry[]> {
  return memo(`yt:${idOrHandle}`, 10 * 60e3, async () => {
    const channelId = await resolveChannel(idOrHandle);
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
      cache: "no-store", // Vercel önbelleğine yazma (kota)
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`YouTube ${res.status}`);
    return parseFeed(await res.text());
  });
}

const UNIT: Record<string, number> = { second: 1e3, minute: 60e3, hour: 3600e3, day: 86400e3, week: 7 * 86400e3, month: 30 * 86400e3, year: 365 * 86400e3 };

const STR = '"((?:[^"\\\\]|\\\\.)*)"';
const TITLE_RES = [
  new RegExp(`"title":\\{"runs":\\[\\{"text":${STR}`),
  new RegExp(`"title":\\{"simpleText":${STR}`),
  new RegExp(`"title":\\{"content":${STR}`),
];
const AGO_RE = /"(?:simpleText|content|text)":"(?:Streamed )?(\d+) (second|minute|hour|day|week|month|year)s? ago"/;

/**
 * YouTube'un kanal arama sayfasındaki (ytInitialData) videolar. RSS'in son 15 videosundan eskiler için.
 * Eski (videoRenderer) ve yeni (lockupViewModel) sayfa yapısını da okur.
 */
export function parseSearch(html: string, now = Date.now()): FeedEntry[] {
  const out: FeedEntry[] = [];
  const seen = new Set<string>();
  const parts = html.split(/"(?:videoRenderer|lockupViewModel|compactVideoRenderer|gridVideoRenderer)":\{/).slice(1);
  for (const part of parts) {
    const chunk = part.slice(0, 8000);
    const videoId = chunk.match(/"(?:videoId|contentId)":"([\w-]{11})"/)?.[1];
    if (!videoId || seen.has(videoId)) continue;
    if (/"contentType":"LOCKUP_CONTENT_TYPE_(?!VIDEO)/.test(chunk)) continue; // oynatma listesi vb.
    const rawTitle = TITLE_RES.map((r) => chunk.match(r)?.[1]).find(Boolean);
    const ago = chunk.match(AGO_RE);
    if (!rawTitle || !ago) continue;
    let title: string;
    try {
      title = JSON.parse(`"${rawTitle}"`);
    } catch {
      continue;
    }
    seen.add(videoId);
    const unit = UNIT[ago[2]];
    const channelId = chunk.match(/"browseId":"(UC[\w-]{22})"/)?.[1];
    out.push({ videoId, title, published: new Date(now - +ago[1] * unit).toISOString(), short: chunk.includes("/shorts/"), approx: unit, channelId });
  }
  return out;
}

const BROWSER_HEADERS = {
  "accept-language": "en-US,en;q=0.8",
  cookie: "CONSENT=YES+1; SOCS=CAI",
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
};

/**
 * YouTube'un kendi sitesinin kullandığı arama ucu (youtubei, anahtarsız). Kanal sayfasındaki arama
 * sonuçları artık sayfayla gelmiyor; genel arama yapılıp sonuçlar resmi kanallara göre süzülür.
 */
async function innertube(query: string): Promise<unknown> {
  const res = await fetch("https://www.youtube.com/youtubei/v1/search?prettyPrint=false", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
    headers: { ...BROWSER_HEADERS, "content-type": "application/json", origin: "https://www.youtube.com" },
    body: JSON.stringify({
      context: { client: { clientName: "WEB", clientVersion: "2.20251101.00.00", hl: "en", gl: "US" } },
      query,
      params: "EgIQAQ%3D%3D", // yalnızca videolar
    }),
  });
  if (!res.ok) throw new Error(`YouTube arama ${res.status}`);
  return res.json();
}

export function searchYouTube(query: string): Promise<FeedEntry[]> {
  return memo(`yts:${query}`, 30 * 60e3, async () => parseSearch(JSON.stringify(await innertube(query))));
}

/** Teşhis: arama ne döndü (yapı değişirse buradan görülür) */
export async function searchDebug(query: string) {
  const raw = JSON.stringify(await innertube(query));
  const count = (k: string) => raw.split(k).length - 1;
  const i = raw.search(/"(?:videoId|contentId)":"/);
  return {
    uzunluk: raw.length,
    videoRenderer: count('"videoRenderer"'),
    lockupViewModel: count('"lockupViewModel"'),
    sonuc: parseSearch(raw).slice(0, 10).map((e) => `${e.published.slice(0, 10)} ${e.channelId ?? "?"} ${e.title}`),
    ornek: i >= 0 ? raw.slice(Math.max(0, i - 200), i + 1200) : raw.slice(0, 1200),
  };
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

// Milli takımlar: ESPN İngilizce ad verir, TRT başlıkları Türkçe ("Türkiye - Belçika (Özet)")
const COUNTRY_TR: Record<string, string[]> = {
  turkiye: ["turkey", "turkiye"], turkey: ["turkiye"], belgium: ["belcika"], germany: ["almanya"], spain: ["ispanya"],
  italy: ["italya"], france: ["fransa"], england: ["ingiltere"], netherlands: ["hollanda"], portugal: ["portekiz"],
  croatia: ["hirvatistan"], czechia: ["cekya", "czech republic"], "czech republic": ["cekya", "czechia"], albania: ["arnavutluk"],
  finland: ["finlandiya"], cyprus: ["kibris", "guney kibris"], armenia: ["ermenistan"], latvia: ["letonya"], montenegro: ["karadag"],
  scotland: ["iskocya"], wales: ["galler"], switzerland: ["isvicre"], austria: ["avusturya"], poland: ["polonya"],
  denmark: ["danimarka"], sweden: ["isvec"], norway: ["norvec"], greece: ["yunanistan"], serbia: ["sirbistan"],
  hungary: ["macaristan"], romania: ["romanya"], ukraine: ["ukrayna"], georgia: ["gurcistan"], iceland: ["izlanda"],
  "republic of ireland": ["irlanda", "ireland"], ireland: ["irlanda"], "northern ireland": ["kuzey irlanda"], slovakia: ["slovakya"],
  slovenia: ["slovenya"], bulgaria: ["bulgaristan"], "bosnia and herzegovina": ["bosna hersek", "bosnia"], "bosnia herzegovina": ["bosna hersek", "bosnia"],
  "north macedonia": ["kuzey makedonya"], kosovo: ["kosova"], israel: ["israil"], estonia: ["estonya"], lithuania: ["litvanya"],
  luxembourg: ["luksemburg"], moldova: ["moldova"], azerbaijan: ["azerbaycan"], kazakhstan: ["kazakistan"], russia: ["rusya"],
  brazil: ["brezilya"], argentina: ["arjantin"], colombia: ["kolombiya"], mexico: ["meksika"], "united states": ["abd", "usa", "usmnt"],
  usa: ["abd", "united states", "usmnt"], japan: ["japonya"], morocco: ["fas"], egypt: ["misir"], "south korea": ["guney kore", "korea republic"],
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
    for (const a of COUNTRY_TR[n] ?? []) set.add(a);
    const longest = stripped.split(" ").filter((w) => !COMMON.has(w)).sort((a, b) => b.length - a.length)[0];
    if (longest && longest.length >= 6) set.add(longest);
  }
  return [...set].filter((a) => a.length >= 2);
}

const has = (title: string, team: string[]) => team.some((a) => title.includes(` ${a} `));
const GOOD = /\b(highlights?|ozet|ozeti|resumen|resume|sintesi|journee|extended|all goals|goals)\b/;
const BAD = /\b(press conference|preview|build up|reaction|interview|every angle|top moment|roportaj|basin toplantisi|analysis|analiz|reacts?|prediction|tahmin|live|canli|full match|tum mac|macin tamami)\b/;
const SCORE = / \d{1,2} \d{1,2} /; // "2-1", "(2-1)" norm sonrası " 2 1 "

/** Bir videonun bu maçın özeti olma puanı; 0 ya da altı = değil. */
export function scoreEntry(e: FeedEntry, m: Pick<MatchDetail, "date" | "home" | "away">, home: string[], away: string[]): number {
  if (e.short) return 0;
  const kick = new Date(m.date).getTime();
  const pub = new Date(e.published).getTime();
  // Maç başlamadan önce yüklenenler özet değildir; 4 günden sonrakiler büyük olasılıkla başka maç
  // approx: arama sonucunun tarihi birim kadar kayabilir ("3 days ago" = 3-4 gün önce)
  const slack = e.approx ?? 0;
  if (!(pub > kick + (slack ? 0 : 45 * 60e3) && pub < kick + 4 * 86400e3 + slack)) return 0;
  const t = norm(e.title);
  if (!has(t, home) || !has(t, away)) return 0;
  if (BAD.test(t)) return 0;
  let s = 0;
  if (GOOD.test(t)) s += 3;
  if (SCORE.test(t)) s += 1;
  return s;
}

export const matchQuery = (m: Pick<MatchDetail, "home" | "away">) =>
  `${m.home.team.short || m.home.team.name} ${m.away.team.short || m.away.team.name}`;

export async function findHighlights(league: string, m: Pick<MatchDetail, "date" | "home" | "away">): Promise<{ found: Highlight[]; complete: boolean }> {
  const home = aliases(m.home.team);
  const away = aliases(m.away.team);
  const chans = channelsFor(league);
  const pick = (entries: FeedEntry[]) => {
    let best: { e: FeedEntry; s: number } | undefined;
    for (const e of entries) {
      const s = scoreEntry(e, m, home, away);
      if (s > 0 && (!best || s > best.s)) best = { e, s };
    }
    return best?.e;
  };
  // 1) RSS (son 15 video)
  const rss = await Promise.all(chans.map((ch) => feed(ch.id).catch(() => null)));
  const best: (FeedEntry | undefined)[] = rss.map((e) => (e ? pick(e) : undefined));
  let ok = rss.map((e) => !!e);
  // 2) Bulunamayanlar için tek bir YouTube araması, sonuçlar yalnızca o kanaldan kabul edilir
  if (best.some((b) => !b)) {
    // Milli maçlarda Türkçe adlarla da ara (TFF/TRT başlıkları "Türkiye - Belçika (Özet)")
    const tr = (t: Team) => COUNTRY_TR[norm(t.name).trim()]?.[0];
    const trQ = tr(m.home.team) || tr(m.away.team) ? `${tr(m.home.team) ?? m.home.team.name} ${tr(m.away.team) ?? m.away.team.name} özet` : null;
    const [results, ids] = await Promise.all([
      Promise.all([`${matchQuery(m)} highlights`, ...(trQ ? [trQ] : [])].map((q) => searchYouTube(q).catch(() => null))).then((rs) =>
        rs.some(Boolean) ? rs.flatMap((r) => r ?? []) : null,
      ),
      Promise.all(chans.map((ch) => resolveChannel(ch.id).catch(() => null))),
    ]);
    if (results) {
      chans.forEach((_, i) => {
        if (best[i] || !ids[i]) return;
        best[i] = pick(results.filter((r) => r.channelId === ids[i]));
      });
      ok = ok.map((v, i) => v || !!ids[i]);
    }
  }
  const found = chans.flatMap((ch, i) => {
    const e = best[i];
    return e ? [{ videoId: e.videoId, title: e.title, channel: ch.name, published: e.published }] : [];
  });
  return { found, complete: chans.every((_, i) => ok[i] && best[i]) };
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
  ["ozet-v3"],
  { revalidate: 30 * 86400 },
);

class NotYet extends Error {
  constructor(public found: Highlight[]) {
    super("ozet henuz yok");
  }
}

/** Biten maçın özet videoları (en fazla 3). Hata vermez; bulunamazsa boş döner. */
export function matchHighlights(league: string, m: MatchDetail): Promise<Highlight[]> {
  if (m.state !== "post") return Promise.resolve([]);
  const age = Date.now() - new Date(m.date).getTime();
  if (age > 30 * 86400e3) return Promise.resolve([]);
  return memo(`ozet:${league}:${m.id}`, 5 * 60e3, () =>
    cached(league, m.id, m.date, m.home.team, m.away.team).catch((e) => (e instanceof NotYet ? e.found : [])),
  ).then((v) => v.slice(0, 3));
// Not: en fazla 3 gösterilir; milli maçta Türkiye oynamıyorsa TFF zaten eşleşmez.
}
