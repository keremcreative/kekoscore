import { admin, sendAll, type Sub } from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ayarlar > "Test bildirimi gönder": bu cihaza (kayıtlı aboneliğine) bir deneme bildirimi */
export async function POST(req: Request) {
  const sb = admin();
  if (!sb) return Response.json({ error: "bildirim ayarları (Vercel ortam değişkenleri) eksik" }, { status: 500 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (typeof endpoint !== "string" || !endpoint) return Response.json({ error: "abonelik yok" }, { status: 400 });
  const { data } = await sb.from("push_subscriptions").select("endpoint, p256dh, auth, user_id").eq("endpoint", endpoint);
  const subs = (data ?? []) as Sub[];
  const sent = await sendAll(sb, subs, { title: "🔔 kekoscore", body: "Test bildirimi: bildirimler bu cihazda çalışıyor.", url: "/ayarlar", tag: "test" }, 300);
  return Response.json({ sent, devices: subs.length });
}
