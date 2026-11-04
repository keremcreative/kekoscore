"use client";
import { useEffect, useState } from "react";
import { OPT_OUT_KEY as KEY, saveSub, subscribePush } from "./PushToggle";

/**
 * Bildirimler herkese varsayılan açık: izin daha önce verildiyse sessizce abone olur,
 * hiç sorulmadıysa tek dokunuşluk bir bant gösterir (iPhone izni yalnızca dokunuşla istetiyor).
 * Kapatmak isteyen Ayarlar'dan kapatır.
 */
export function NotifPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
      if (Notification.permission === "granted") {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await saveSub(sub);
        else if (!dismissed()) await subscribePush(); // izin var, abonelik yok: dokunuş gerekmez
        return;
      }
      if (Notification.permission === "default" && !dismissed()) setShow(true);
    })().catch(() => {});
  }, []);

  if (!show) return null;

  async function enable() {
    setBusy(true);
    try {
      await subscribePush();
    } catch {}
    setShow(false);
  }
  function close() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
  }

  return (
    <div className="notif-prompt" role="dialog" aria-label="Bildirimler">
      <span>🔔 Gol, maç ve duyuru bildirimlerini açmak için dokun</span>
      <button className="np-on" onClick={enable} disabled={busy}>
        {busy ? "…" : "Aç"}
      </button>
      <button className="np-x" onClick={close} aria-label="Kapat">
        ✕
      </button>
    </div>
  );
}

function dismissed() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
