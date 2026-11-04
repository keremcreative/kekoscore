"use client";
import { useState } from "react";

import { COLLAPSE_COOKIE } from "@/lib/collapse";

/** Ana sayfadaki lig kartı: soldaki oka dokununca maçlar yukarı kayarak kapanır */
export function LeagueSection({
  code,
  initiallyClosed,
  head,
  children,
  cookie = COLLAPSE_COOKIE,
  storeOpen = false,
  headToggles = false,
}: {
  code: string;
  initiallyClosed: boolean;
  head: React.ReactNode;
  children: React.ReactNode;
  /** Durumun saklandığı çerez */
  cookie?: string;
  /** true: çerez açık olanları tutar (varsayılan kapalı listeler için) */
  storeOpen?: boolean;
  /** Başlığın tamamına dokununca da aç/kapa */
  headToggles?: boolean;
}) {
  const [closed, setClosed] = useState(initiallyClosed);
  function toggle() {
    const next = !closed;
    setClosed(next);
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${cookie}=([^;]*)`));
    const set = new Set((m ? decodeURIComponent(m[1]) : "").split(",").filter(Boolean));
    if (next !== storeOpen) set.add(code);
    else set.delete(code);
    document.cookie = `${cookie}=${encodeURIComponent([...set].join(","))}; path=/; max-age=31536000; samesite=lax`;
  }
  return (
    <section className={`card league-sec${closed ? " closed" : ""}`}>
      <div className={`ls-head${headToggles ? " tap" : ""}`} onClick={headToggles ? toggle : undefined}>
        <button
          type="button"
          className="ls-toggle"
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }} aria-expanded={!closed} aria-label={closed ? "Maçları göster" : "Maçları gizle"}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {head}
      </div>
      <div className="ls-body" aria-hidden={closed}>
        <div className="ls-inner">{children}</div>
      </div>
    </section>
  );
}
