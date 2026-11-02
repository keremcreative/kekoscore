"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { TzKey } from "@/lib/tz";

/** Türkiye / ABD (Massachusetts) saat dilimi seçici */
export function TzSwitch({ value }: { value: TzKey }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function set(v: TzKey) {
    if (v === value) return;
    document.cookie = `tz=${v}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  }
  return (
    <div className={`tz-switch${value === "us" ? " us" : ""}${pending ? " pending" : ""}`} role="radiogroup" aria-label="Saat dilimi">
      <span className="tz-thumb" aria-hidden />
      <button role="radio" aria-checked={value === "tr"} onClick={() => set("tr")} title="Türkiye saati">
        🇹🇷
      </button>
      <button role="radio" aria-checked={value === "us"} onClick={() => set("us")} title="ABD Doğu saati (Massachusetts)">
        🇺🇸
      </button>
    </div>
  );
}
