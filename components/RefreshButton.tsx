"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

/**
 * Üst çubuktaki yenile butonu: veriler gelmezse ya da eski görünürse sayfayı elle yeniler
 * (sunucudan taze veri ister). Yenileme sürerken simge döner (en az 0,6 sn, fark edilsin diye).
 * Aşağı çekip yenileme denendi; gezinirken yanlışlıkla tetiklendiği için kaldırıldı.
 */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [spin, setSpin] = useState(false);
  const [minUntil, setMinUntil] = useState(0);

  useEffect(() => {
    if (!spin || pending) return;
    const t = setTimeout(() => setSpin(false), Math.max(0, minUntil - Date.now()));
    return () => clearTimeout(t);
  }, [spin, pending, minUntil]);

  return (
    <button
      type="button"
      className={`top-search top-refresh${spin ? " spin" : ""}`}
      aria-label="Yenile"
      disabled={spin}
      onClick={() => {
        setSpin(true);
        setMinUntil(Date.now() + 600);
        startTransition(() => router.refresh());
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <path d="M21 4v5h-5" />
      </svg>
    </button>
  );
}
