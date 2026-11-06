"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Sayfayı arka planda yeniler.
 * - active iken her `seconds` saniyede bir (canlı ya da birazdan başlayacak maç varken).
 * - Uygulamaya geri dönüldüğünde HER ZAMAN: iPhone ana ekran uygulaması arka plandan açılınca
 *   sayfayı yeniden yüklemiyor; eskiden canlı maç yoksa hiç yenilenmiyor ve skor dakikalarca eski kalıyordu.
 */
export function AutoRefresh({ active, seconds = 30 }: { active: boolean; seconds?: number }) {
  const router = useRouter();
  const last = useRef(Date.now());
  useEffect(() => {
    const refresh = () => {
      last.current = Date.now();
      router.refresh();
    };
    // Geri dönüş: 5 sn'den eskiyse yenile (ardışık olayları tek yenilemeye indir)
    const onReturn = () => document.visibilityState === "visible" && Date.now() - last.current > 5000 && refresh();
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    window.addEventListener("pageshow", onReturn);
    const id = active ? setInterval(() => document.visibilityState === "visible" && refresh(), seconds * 1000) : undefined;
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("pageshow", onReturn);
    };
  }, [active, seconds, router]);
  return null;
}
