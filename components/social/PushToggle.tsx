"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

type State = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on" | "busy";

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Aboneliği sunucuya kaydet (giriş yapılmamışsa da); girişliyse hesaba bağlanır */
export async function saveSub(sub: PushSubscription): Promise<void> {
  const j = sub.toJSON();
  let token: string | undefined;
  try {
    token = (await supabase().auth.getSession()).data.session?.access_token;
  } catch {}
  const r = await fetch("/api/push-sub", {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ endpoint: sub.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth }),
  });
  if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? `sunucu ${r.status}`);
}

/** İzin iste ve abone ol; kullanıcı dokunuşuyla çağrılmalı (iPhone şartı) */
export async function subscribePush(): Promise<"on" | "off" | "denied"> {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "off";
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID!) }));
  await saveSub(sub);
  return "on";
}

/** Kullanıcı bildirimleri kendisi kapattıysa hatırla (NotifPrompt bunu okur) */
export const OPT_OUT_KEY = "notif-prompt-dismissed";
function setOptOut(v: boolean) {
  try {
    if (v) localStorage.setItem(OPT_OUT_KEY, "1");
    else localStorage.removeItem(OPT_OUT_KEY);
  } catch {}
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Bu cihazda bildirimleri açar/kapatır (sohbet ve maç bildirimleri aynı abonelikle gelir) */
export { isIOS, isStandalone };

export function PushToggle({ offLabel = "🔕 Yeni mesajlarda bildirim al", onChange }: { offLabel?: string; onChange?: (on: boolean) => void }) {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState("");
  const [test, setTest] = useState("");

  useEffect(() => {
    (async () => {
      if (!VAPID) return setState("unsupported");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // iPhone'da Safari sekmesinde PushManager yok; ana ekrandan açılınca var
        return setState(isIOS() && !isStandalone() ? "needs-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
      onChange?.(!!sub);
      // Telefonda abonelik var ama sunucudaki kayıt silinmiş olabilir (süresi dolan abonelikler
      // gönderimde silinir). Her açılışta yeniden kaydet ki bildirimler sessizce kesilmesin.
      if (sub) await saveSub(sub);
    })().catch(() => setState((s) => (s === "loading" ? "unsupported" : s)));
  }, []);

  async function enable() {
    setError("");
    setState("busy");
    try {
      const r = await subscribePush();
      if (r === "on") setOptOut(false);
      setState(r);
      onChange?.(r === "on");
    } catch (e) {
      setError("Bildirim açılamadı: " + (e as Error).message);
      setState("off");
    }
  }

  async function sendTest() {
    setTest("Gönderiliyor…");
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (!sub) return setTest("Bu cihazda abonelik yok. Kapatıp yeniden aç.");
      await saveSub(sub);
      const r = await fetch("/api/test-push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      const j = (await r.json().catch(() => ({}))) as { sent?: number; devices?: number; error?: string };
      if (!r.ok || j.error) return setTest(`Gönderilemedi: ${j.error ?? r.status}`);
      setTest(j.sent ? `Gönderildi (${j.sent}/${j.devices} cihaz). Birkaç saniye içinde gelmeli.` : `Kayıtlı cihaz bulunamadı (${j.devices ?? 0}). Kapatıp yeniden aç.`);
    } catch (e) {
      setTest("Gönderilemedi: " + (e as Error).message);
    }
  }

  async function disable() {
    setState("busy");
    setOptOut(true); // kapatan kişiye bant ya da sessiz abonelik yeniden açmasın
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push-sub", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
    } finally {
      setState("off");
      onChange?.(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;
  if (state === "needs-install")
    return <p className="push-hint">🔔 Bildirim almak için kekoscore'u ana ekrana ekleyip oradan aç.</p>;
  if (state === "denied")
    return <p className="push-hint">🔕 Bildirim izni kapalı. iPhone Ayarlar → Bildirimler → kekoscore'dan açabilirsin.</p>;
  return (
    <div className="push-row">
      <span>{state === "on" ? "🔔 Bu cihazda bildirimler açık" : offLabel}</span>
      <button className="link-btn strong" onClick={state === "on" ? disable : enable} disabled={state === "busy"}>
        {state === "busy" ? "…" : state === "on" ? "Kapat" : "Aç"}
      </button>
      {state === "on" && (
        <button className="link-btn" onClick={sendTest}>
          Test bildirimi gönder
        </button>
      )}
      {test && <p className="push-hint">{test}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
