import { isAdmin } from "@/lib/admin";
import { admin, sendAll, type Sub } from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Yöneticinin (ör. @kerem) tüm kullanıcılara özel bildirim göndermesi.
 * Gövde: { title, body, url? }. Yetki: Authorization: Bearer <oturum anahtarı>; kullanıcı adı yönetici listesinde olmalı.
 */
export async function POST(req: Request) {
  const sb = admin();
  if (!sb) return Response.json({ error: "bildirim ayarları (Vercel ortam değişkenleri) eksik" }, { status: 500 });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "giriş gerekli" }, { status: 401 });
  const { data: u } = await sb.auth.getUser(token);
  if (!u.user) return Response.json({ error: "giriş gerekli" }, { status: 401 });
  const { data: prof } = await sb.from("profiles").select("username").eq("id", u.user.id).maybeSingle();
  if (!isAdmin(prof?.username)) return Response.json({ error: "yetkin yok" }, { status: 403 });

  const { title, body, url } = (await req.json().catch(() => ({}))) as { title?: string; body?: string; url?: string };
  const t = String(title ?? "").trim().slice(0, 80);
  const b = String(body ?? "").trim().slice(0, 300);
  if (!t && !b) return Response.json({ error: "başlık ya da mesaj yaz" }, { status: 400 });
  // Yalnızca uygulama içi bağlantılar
  const link = typeof url === "string" && url.startsWith("/") && !url.startsWith("//") ? url : "/";

  const { data } = await sb.from("push_subscriptions").select("endpoint, p256dh, auth, user_id");
  const subs = (data ?? []) as Sub[];
  const sent = await sendAll(sb, subs, { title: t || "kekoscore", body: b, url: link, tag: `duyuru-${Date.now()}` }, 3600);
  const users = new Set(subs.map((s) => s.user_id)).size;
  return Response.json({ sent, devices: subs.length, users });
}
