"use client";
import { useEffect } from "react";

/** Bildirimler için service worker'ı kaydeder */
export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
