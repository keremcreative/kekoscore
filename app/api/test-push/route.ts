import { admin, sendAll, type Sub } from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ayarlar > "Test bildirimi gönder": giriş yapan kullanıcının kendi cihazlarına bir deneme bildirimi */
export async function POST(req: Request) {
  const sb = admin();
  if (!sb) return Response.json({ error: "bildirim ayarları (Vercel ortam değişkenleri) eksik" }, { status: 500 });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "giriş gerekli" }, { status: 401 });
  const { data: u } = await sb.auth.getUser(token);
  if (!u.user) return Response.json({ error: "giriş gerekli" }, { status: 401 });
  const { data } = await sb.from("push_subscriptions").select("endpoint, p256dh, auth, user_id").eq("user_id", u.user.id);
  const subs = (data ?? []) as Sub[];
  const sent = await sendAll(sb, subs, { title: "🔔 kekoscore", body: "Test bildirimi: bildirimler bu cihazda çalışıyor.", url: "/ayarlar", tag: "test" }, 300);
  return Response.json({ sent, devices: subs.length });
}
