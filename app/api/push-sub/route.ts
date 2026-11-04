import { admin } from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Yalnızca bilinen tarayıcı bildirim servisleri
const HOSTS = [/\.push\.apple\.com$/, /^fcm\.googleapis\.com$/, /\.mozilla\.com$/, /\.notify\.windows\.com$/];
function validEndpoint(e: unknown): e is string {
  if (typeof e !== "string" || e.length > 1000) return false;
  try {
    const u = new URL(e);
    return u.protocol === "https:" && HOSTS.some((h) => h.test(u.hostname));
  } catch {
    return false;
  }
}

async function userOf(req: Request, sb: NonNullable<ReturnType<typeof admin>>): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await sb.auth.getUser(token);
  return data.user?.id ?? null;
}

/**
 * Cihaz aboneliğini kaydeder. Giriş yapmamış kullanıcılar da kaydolabilir (user_id boş kalır;
 * büyük maç hatırlatmaları ve duyurular gider). Giriş yapan kullanıcının aboneliği hesabına bağlanır.
 */
export async function POST(req: Request) {
  const sb = admin();
  if (!sb) return Response.json({ error: "bildirim ayarlı değil" }, { status: 500 });
  const { endpoint, p256dh, auth } = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!validEndpoint(endpoint) || typeof p256dh !== "string" || typeof auth !== "string") {
    return Response.json({ error: "geçersiz abonelik" }, { status: 400 });
  }
  const uid = await userOf(req, sb);
  const { data: old } = await sb.from("push_subscriptions").select("user_id").eq("endpoint", endpoint).maybeSingle();
  // Girişsiz bir kayıt, hesaba bağlı bir aboneliği hesapsız hale getirmesin
  const user_id = uid ?? old?.user_id ?? null;
  const { error } = await sb.from("push_subscriptions").upsert({ endpoint, p256dh, auth, user_id }, { onConflict: "endpoint" });
  if (error) {
    const hint = /null value/i.test(error.message) ? " (Supabase'de bildirim-herkes.sql çalıştırılmalı)" : "";
    return Response.json({ error: error.message + hint }, { status: 500 });
  }
  return Response.json({ ok: true, linked: !!user_id });
}

/** Bu cihazda bildirimleri kapat */
export async function DELETE(req: Request) {
  const sb = admin();
  if (!sb) return Response.json({ ok: true });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (validEndpoint(endpoint)) await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return Response.json({ ok: true });
}
