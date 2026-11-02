"use client";
import { useEffect, useState } from "react";
import type { FavKind } from "@/lib/favs";
import { useFavs } from "./useFavs";

/** Yıldız: favorilere ekle / çıkar */
export function FavButton({ kind, refId }: { kind: FavKind; refId: string }) {
  const { has, toggle } = useFavs();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const on = mounted && has(kind, refId);
  return (
    <button
      type="button"
      className={`fav${on ? " on" : ""}`}
      aria-pressed={on}
      aria-label={on ? "Favorilerden çıkar" : "Favorilere ekle"}
      onClick={() => toggle(kind, refId)}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
      </svg>
    </button>
  );
}
