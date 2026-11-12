"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/** Bu kadar (px) çekilince bırakınca yenilenir */
const THRESHOLD = 70;
const MAX = 110;

/**
 * Aşağı çekip yenileme. iPhone'da ana ekrana eklenen uygulamada Safari'nin kendi
 * "çek-yenile"si yok; sayfanın en üstündeyken parmakla aşağı çekince sayfa yeniden yüklenir.
 * Sohbette kapalı (orada yukarı kaydırma eski mesajlar için).
 */
export function PullToRefresh() {
  const router = useRouter();
  const path = usePathname();
  const [pull, setPull] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [pending, startTransition] = useTransition();
  const start = useRef<{ x: number; y: number } | null>(null);
  const pulling = useRef(false);
  const dist = useRef(0);
  const minUntil = useRef(0);
  const spinningRef = useRef(false);
  const disabled = path.startsWith("/sohbet");

  useEffect(() => {
    if (disabled) return;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || window.scrollY > 0 || spinningRef.current) return (start.current = null), undefined;
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      pulling.current = false;
    };
    const onMove = (e: TouchEvent) => {
      if (!start.current) return;
      const dx = e.touches[0].clientX - start.current.x;
      const dy = e.touches[0].clientY - start.current.y;
      if (!pulling.current) {
        // Yatay kaydırma (tarih şeridi, bant) ya da yukarı kaydırma ise karışma
        if (Math.abs(dy) < 8) return;
        if (dy < 0 || Math.abs(dx) > Math.abs(dy) || window.scrollY > 0) return (start.current = null), undefined;
        pulling.current = true;
      }
      if (e.cancelable) e.preventDefault();
      dist.current = Math.min(MAX, Math.max(0, dy - 8) * 0.55);
      setPull(dist.current);
    };
    const onEnd = () => {
      if (!start.current || !pulling.current) return (start.current = null), undefined;
      start.current = null;
      pulling.current = false;
      if (dist.current >= THRESHOLD) {
        spinningRef.current = true;
        setSpinning(true);
        minUntil.current = Date.now() + 600;
        startTransition(() => router.refresh());
      }
      dist.current = 0;
      setPull(0);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [disabled, router]);

  // Yenileme bitince (en az 0,6 sn göster ki dönüş fark edilsin) göstergeyi kapat
  useEffect(() => {
    if (!spinning || pending) return;
    const t = setTimeout(() => {
      spinningRef.current = false;
      setSpinning(false);
    }, Math.max(0, minUntil.current - Date.now()));
    return () => clearTimeout(t);
  }, [spinning, pending]);

  if (disabled || (!pull && !spinning)) return null;
  const y = spinning ? THRESHOLD * 0.75 : pull * 0.75;
  const ready = pull >= THRESHOLD;
  return (
    <div className={`ptr${spinning ? " spin" : ""}${ready ? " ready" : ""}`} style={{ transform: `translate(-50%, ${y}px)`, opacity: spinning ? 1 : Math.min(1, pull / 40) }} aria-hidden>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={spinning ? undefined : { transform: `rotate(${(pull / THRESHOLD) * 270}deg)` }}>
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <path d="M21 4v5h-5" />
      </svg>
    </div>
  );
}
