/**
 * Haberler: beş güvenilir kaynaktan başlık + bağlantı (içerik kopyalanmaz).
 * BBC Sport, The Guardian, Sky Sports (RSS), ESPN (JSON), Anadolu Ajansı (RSS).
 * Bir kaynak çökerse diğerleri gösterilmeye devam eder.
 */
export type NewsTag = "transfer" | "sakatlik";

export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  link: string;
  source: string;
  lang: "tr" | "en";
  date: string; // ISO
  image?: string;
  tags: NewsTag[];
}

interface Feed {
  source: string;
  lang: "tr" | "en";
  url: string;
}

export const SOURCES: Feed[] = [
  { source: "BBC Sport", lang: "en", url: "https://feeds.bbci.co.uk/sport/football/rss.xml" },
  { source: "The Guardian", lang: "en", url: "https://www.theguardian.com/football/rss" },
  { source: "Sky Sports", lang: "en", url: "https://www.skysports.com/rss/11095" },
  { source: "Anadolu Ajansı", lang: "tr", url: "https://www.aa.com.tr/tr/rss/default?cat=futbol" },
];
const ESPN_LEAGUES = ["eng.1", "esp.1", "ita.1", "ger.1", "uefa.champions"];

const TRANSFER = /transfer|signs?\b|signing|deal\b|loan|bid\b|fee\b|move to|contract|swoop|target|talks|medical|release clause|free agent|imza|kirala|bonservis|sözleşme|anlaş|görüş|teklif|gündem/i;
const INJURY = /injur|ruled out|sidelined|hamstring|ligament|surgery|fitness|knock|sakat|ameliyat|tedavi|kadro dışı|cezalı|forma giyemeyecek/i;

export function tagsFor(text: string): NewsTag[] {
  const t: NewsTag[] = [];
  if (TRANSFER.test(text)) t.push("transfer");
  if (INJURY.test(text)) t.push("sakatlik");
  return t;
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function clean(s = ""): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) =>
      e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e] ?? m,
    )
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1];
const attr = (xml: string, name: string, a: string) =>
  xml.match(new RegExp(`<${name}[^>]*\\s${a}=["']([^"']+)["']`, "i"))?.[1];

export function parseRss(xml: string, f: Feed): NewsItem[] {
  return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map(([it]) => {
    const title = clean(tag(it, "title"));
    const summary = clean(tag(it, "description")) || undefined;
    const link = clean(tag(it, "link")) || clean(tag(it, "guid"));
    const d = new Date(clean(tag(it, "pubDate")) || clean(tag(it, "dc:date")));
    const image =
      attr(it, "media:thumbnail", "url") ??
      attr(it, "media:content", "url") ??
      attr(it, "enclosure", "url") ??
      (clean(tag(it, "image")) || undefined);
    return {
      id: link,
      title,
      summary: summary && summary !== title ? summary.slice(0, 220) : undefined,
      link,
      source: f.source,
      lang: f.lang,
      date: Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString(),
      image: image?.startsWith("http") ? image : undefined,
      tags: tagsFor(`${title} ${summary ?? ""}`),
    };
  }).filter((n) => n.title && n.link.startsWith("http"));
}

async function rss(f: Feed): Promise<NewsItem[]> {
  const res = await fetch(f.url, { next: { revalidate: 600 }, headers: { "user-agent": "kekoscore/1.0 (+https://kekoscore.vercel.app)" } });
  if (!res.ok) throw new Error(`${f.source} ${res.status}`);
  return parseRss(await res.text(), f);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;
async function espn(league: string): Promise<NewsItem[]> {
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/news?limit=15`, { next: { revalidate: 600 } });
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  const data: J = await res.json();
  return (data?.articles ?? [])
    .map((a: J): NewsItem => {
      const title = a?.headline ?? "";
      const summary = a?.description || undefined;
      return {
        id: `espn-${a?.id ?? a?.links?.web?.href}`,
        title,
        summary,
        link: a?.links?.web?.href ?? "",
        source: "ESPN",
        lang: "en",
        date: a?.published ?? a?.lastModified ?? new Date(0).toISOString(),
        image: a?.images?.[0]?.url,
        tags: tagsFor(`${title} ${summary ?? ""}`),
      };
    })
    .filter((n: NewsItem) => n.title && n.link.startsWith("http"));
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export async function getNews(): Promise<{ items: NewsItem[]; failed: string[] }> {
  if (process.env.DATA_SOURCE === "mock") return { items: mockNews(), failed: [] };
  const jobs: [string, Promise<NewsItem[]>][] = [
    ...SOURCES.map((f) => [f.source, rss(f)] as [string, Promise<NewsItem[]>]),
    ["ESPN", Promise.allSettled(ESPN_LEAGUES.map(espn)).then((r) => {
      const ok = r.flatMap((x) => (x.status === "fulfilled" ? x.value : []));
      if (!ok.length && r.every((x) => x.status === "rejected")) throw new Error("ESPN");
      return ok;
    })],
  ];
  const settled = await Promise.allSettled(jobs.map(([, p]) => p));
  const failed = jobs.filter((_, i) => settled[i].status === "rejected").map(([s]) => s);
  const seen = new Set<string>();
  const items = settled
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((n) => {
      const k = norm(n.title);
      if (seen.has(k) || seen.has(n.link)) return false;
      seen.add(k);
      seen.add(n.link);
      return true;
    })
    .slice(0, 120);
  return { items, failed };
}

function mockNews(): NewsItem[] {
  const now = Date.now();
  const raw: [string, string, "tr" | "en", string][] = [
    ["Anadolu Ajansı", "tr", "Galatasaray, Avrupalı orta saha için resmi görüşmelere başladı", "Sarı-kırmızılı kulüp, ocak transfer döneminde kadroya takviye yapmayı planlıyor."],
    ["BBC Sport", "en", "Arsenal close in on deal for Bundesliga winger", "The Gunners are in advanced talks over a January move."],
    ["Sky Sports", "en", "Liverpool defender ruled out for six weeks with hamstring injury", "Scans confirmed the injury after Saturday's win."],
    ["The Guardian", "en", "Real Madrid's midfield reshuffle explained", "How the new system is changing their build-up play."],
    ["ESPN", "en", "Bayern Munich open contract talks with star striker", "Talks are expected to continue into next month."],
    ["Anadolu Ajansı", "tr", "Fenerbahçe'de sakatlık şoku: Yıldız oyuncu 3 hafta yok", "Yapılan tetkiklerde kas zorlanması tespit edildi."],
    ["BBC Sport", "en", "Champions League: what each English side needs in matchday five", ""],
    ["Anadolu Ajansı", "tr", "Beşiktaş, deplasmanda Kasımpaşa'ya takıldı", ""],
  ].map(([s, l, t, d]) => [s, t, l as "tr" | "en", d]) as [string, string, "tr" | "en", string][];
  return raw.map(([source, title, lang, summary], i) => ({
    id: `mock-${i}`,
    title,
    summary: summary || undefined,
    link: `https://example.com/haber/${i}`,
    source,
    lang,
    date: new Date(now - i * 47 * 60_000).toISOString(),
    tags: tagsFor(`${title} ${summary}`),
  }));
}
