import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const PUB = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIV = process.env.VAPID_PRIVATE_KEY;

/**
 * Sohbete yeni mesaj yazıldığında, yazan hariç herkesin cihazlarına bildirim yollar.
 * Gövde: { messageId }. Yetki: Authorization: Bearer <kullanıcının oturum anahtarı>.
 */
export async function POST(req: Request) {
  if (!URL_ || !SECRET || !PUB || !PRIV) return Response.json({ skipped: "bildirim ayarlı değil" });

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return new Response("Yetkisiz", { status: 401 });
  const { messageId } = (await req.json().catch(() => ({}))) as { messageId?: number };
  if (!messageId) return new Response("messageId gerekli", { status: 400 });

  const admin = createClient(URL_, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: u, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !u.user) return new Response("Yetkisiz", { status: 401 });

  // Mesaj gerçekten bu kullanıcının ve yeni mi? (başkası adına ya da tekrar tekrar bildirim atılmasın)
  const { data: msg } = await admin.from("messages").select("id, user_id, body, room, created_at").eq("id", messageId).maybeSingle();
  if (!msg || msg.user_id !== u.user.id) return new Response("Mesaj bulunamadı", { status: 404 });
  if (Date.now() - new Date(msg.created_at).getTime() > 2 * 60 * 1000) return Response.json({ skipped: "eski mesaj" });

  const [{ data: who }, { data: subs }] = await Promise.all([
    admin.from("profiles").select("username").eq("id", msg.user_id).maybeSingle(),
    admin.from("push_subscriptions").select("endpoint, p256dh, auth").neq("user_id", msg.user_id),
  ]);

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:kekoscore@example.com", PUB, PRIV);
  const payload = JSON.stringify({
    title: who?.username ?? "kekoscore",
    body: msg.body.length > 140 ? msg.body.slice(0, 137) + "…" : msg.body,
    url: "/sohbet",
    tag: `sohbet-${msg.room}`,
  });

  const dead: string[] = [];
  const results = await Promise.allSettled(
    (subs ?? []).map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: "high" })
        .catch((e: { statusCode?: number }) => {
          if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(s.endpoint);
          throw e;
        })
    )
  );
  if (dead.length) await admin.from("push_subscriptions").delete().in("endpoint", dead);

  return Response.json({ sent: results.filter((r) => r.status === "fulfilled").length, failed: results.filter((r) => r.status === "rejected").length });
}
