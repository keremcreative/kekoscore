import { getAllLeagueDays } from "@/lib/data";
import { espnHealth, probe } from "@/lib/espn";
import { shiftDays, ymd } from "@/lib/format";
import { LEAGUES } from "@/lib/leagues";
import { memo } from "@/lib/memo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Teşhis: ESPN şu an bu sunucuya ne dönüyor ve ana sayfa hangi veriyi gösteriyor. Sorun olduğunda
 * /api/durum açılır. Gizli bilgi içermez; 20 sn'de bir yenilenir (ESPN'e 5 istek).
 */
export async function GET(req: Request) {
  const league = new URL(req.url).searchParams.get("lig") ?? "uefa.nations";
  if (!LEAGUES.some((l) => l.code === league)) return Response.json({ error: "bilinmeyen lig" }, { status: 400 });
  const body = await memo(`durum:${league}`, 20_000, async () => {
    const tz = "America/New_York";
    const now = new Date();
    const today = ymd(now, tz);
    const yesterday = ymd(shiftDays(now, -1), tz);
    const t = Math.floor(Date.now() / 10000);
    const [probes, home] = await Promise.all([
      Promise.all([
        probe(`${league}/scoreboard?dates=${today}`),
        probe(`${league}/scoreboard?dates=${today}&_t=${t}`),
        probe(`${league}/scoreboard?dates=${yesterday}-${today}&limit=200`),
        probe(`${league}/scoreboard?dates=${yesterday}-${today}&limit=200&_t=${t}`),
        probe(`${league}/scoreboard`),
      ]),
      getAllLeagueDays(yesterday, today, tz).then(
        (rs) =>
          LEAGUES.map((l, i) => {
            const r = rs[i];
            if (!r) return `${l.code}: ALINAMADI`;
            const n = (s: string) => r.filter((m) => m.state === s).length;
            return `${l.code}: ${r.length} maç (canlı ${n("in")}, biten ${n("post")}, başlamadı ${n("pre")})`;
          }),
        (e) => [`ana sayfa verisi alınamadı: ${(e as Error)?.message}`],
      ),
    ]);
    const ago = (x: number) => (x ? `${Math.round((Date.now() - x) / 1000)} sn önce` : "yok");
    return { zaman: now.toISOString(), lig: league, espn: probes, anaSayfa: home, sonHata: espnHealth.lastError || "yok", sonHataZamani: ago(espnHealth.lastErrorAt), sonBasarili: ago(espnHealth.lastOkAt) };
  });
  return Response.json(body, { headers: { "cache-control": "no-store" } });
}
