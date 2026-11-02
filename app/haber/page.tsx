import { Tabs } from "@/components/Tabs";
import { kickoff, shortDate, ymd } from "@/lib/format";
import { getNews, type NewsItem } from "@/lib/news";
import { initTz } from "@/lib/tz";

export const metadata = { title: "Haberler · kekoscore" };

const FILTERS = [
  { key: "hepsi", label: "Tümü" },
  { key: "transfer", label: "Transfer" },
  { key: "sakatlik", label: "Sakatlık" },
  { key: "tr", label: "Türkçe" },
];

function when(iso: string) {
  const d = new Date(iso);
  return ymd(d) === ymd(new Date()) ? kickoff(iso) : `${shortDate(iso)} ${kickoff(iso)}`;
}

function pick(items: NewsItem[], f: string) {
  if (f === "transfer" || f === "sakatlik") return items.filter((n) => n.tags.includes(f));
  if (f === "tr") return items.filter((n) => n.lang === "tr");
  return items;
}

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ sekme?: string }> }) {
  await initTz();
  const f = (await searchParams).sekme ?? "hepsi";
  const { items, failed } = await getNews();
  const list = pick(items, f);
  return (
    <>
      <h1 className="page-title">Haberler</h1>
      <Tabs items={FILTERS} current={f} base="/haber" />
      {list.length === 0 ? (
        <div className="card empty">Şu an bu başlıkta haber yok.</div>
      ) : (
        <div className="card news-list">
          {list.map((n) => (
            <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" className="news">
              <div className="news-body">
                <div className="news-meta">
                  <b>{n.source}</b> · {when(n.date)}
                  {n.tags.includes("transfer") && <span className="news-tag">Transfer</span>}
                  {n.tags.includes("sakatlik") && <span className="news-tag inj">Sakatlık</span>}
                </div>
                <div className="news-title">{n.title}</div>
                {n.summary && <div className="news-sum">{n.summary}</div>}
              </div>
              {n.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.image} alt="" className="news-img" loading="lazy" />
              )}
            </a>
          ))}
        </div>
      )}
      <p className="foot-note">
        Kaynaklar: BBC Sport, The Guardian, Sky Sports, ESPN, Anadolu Ajansı. Habere dokununca kaynağın kendi sitesinde açılır.
        {failed.length > 0 && ` Şu an ulaşılamayan: ${failed.join(", ")}.`}
      </p>
    </>
  );
}
