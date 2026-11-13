import { CHANNELS, channelsFor, feed, findHighlights, searchChannel, searchDebug } from "@/lib/highlights";
import { getMatch } from "@/lib/data";
import { memo } from "@/lib/memo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Teşhis: özet kanallarının RSS akışları bu sunucudan okunabiliyor mu, son videolar neler.
 * ?lig=eng.1&mac=ID ile o maç için hangi videoların eşleştiği görülür. Önbelleğe yazmaz.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const lig = q.get("lig");
  const mac = q.get("mac");
  const ham = q.get("ham");
  if (ham) {
    // ?ham=<kanal kimliği ya da @kullanıcı>&q=<sorgu>: arama sayfasının ham yapısı
    const kanal = ham.startsWith("@") || ham.startsWith("UC") ? ham : CHANNELS[ham as keyof typeof CHANNELS]?.id;
    if (!kanal) return Response.json({ error: "bilinmeyen kanal" }, { status: 400 });
    const r = await memo(`ozet-ham:${kanal}:${q.get("q")}`, 60_000, () => searchDebug(kanal, q.get("q") ?? "highlights").catch((e) => ({ hata: String(e.message) })));
    return Response.json(r);
  }
  const chans = lig ? channelsFor(lig) : Object.values(CHANNELS);
  const body = await memo(`ozet-durum:${lig}:${mac}`, 30_000, async () => {
    const feeds = await Promise.all(
      chans.map(async (c) => {
        try {
          const e = await feed(c.id);
          return { kanal: c.name, id: c.id, durum: "ok", video: e.length, son: e.slice(0, 5).map((x) => `${x.published.slice(0, 10)} ${x.short ? "[short] " : ""}${x.title}`) };
        } catch (err) {
          return { kanal: c.name, id: c.id, durum: String((err as Error).message) };
        }
      }),
    );
    let eslesme: unknown;
    if (lig && mac) {
      try {
        const m = await getMatch(lig, mac);
        const query = `${m.home.team.short || m.home.team.name} ${m.away.team.short || m.away.team.name}`;
        const arama = await Promise.all(
          chans.map(async (c) => {
            try {
              const r = await searchChannel(c.id, query);
              return { kanal: c.name, sorgu: query, sonuc: r.slice(0, 6).map((x) => `${x.published.slice(0, 10)} ${x.title}`) };
            } catch (err) {
              return { kanal: c.name, sorgu: query, hata: String((err as Error).message) };
            }
          }),
        );
        eslesme = { mac: `${m.home.team.name} - ${m.away.team.name}`, tarih: m.date, durum: m.state, ...(await findHighlights(lig, m)), arama };
      } catch (err) {
        eslesme = { hata: String((err as Error).message) };
      }
    }
    return { kanallar: feeds, eslesme };
  });
  return Response.json(body);
}
