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

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Sohbet bildirimlerini bu cihazda açar/kapatır */
export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState("");

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
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setError("");
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID!) }));
      const j = sub.toJSON();
      const { error } = await supabase()
        .from("push_subscriptions")
        .upsert({ endpoint: sub.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth }, { onConflict: "endpoint" });
      if (error) throw error;
      setState("on");
    } catch (e) {
      setError("Bildirim açılamadı: " + (e as Error).message);
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
    } finally {
      setState("off");
    }
  }

  if (state === "loading" || state === "unsupported") return null;
  if (state === "needs-install")
    return <p className="push-hint">🔔 Bildirim almak için kekoscore'u ana ekrana ekleyip oradan aç.</p>;
  if (state === "denied")
    return <p className="push-hint">🔕 Bildirim izni kapalı. iPhone Ayarlar → Bildirimler → kekoscore'dan açabilirsin.</p>;
  return (
    <div className="push-row">
      <span>{state === "on" ? "🔔 Bildirimler açık" : "🔕 Yeni mesajlarda bildirim al"}</span>
      <button className="link-btn strong" onClick={state === "on" ? disable : enable} disabled={state === "busy"}>
        {state === "busy" ? "…" : state === "on" ? "Kapat" : "Aç"}
      </button>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
