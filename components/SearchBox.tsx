"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Yazdıkça sonuçları güncelleyen arama kutusu */
export function SearchBox({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => router.replace(q.trim() ? `/ara?q=${encodeURIComponent(q.trim())}` : "/ara", { scroll: false }), 250);
    return () => clearTimeout(t);
  }, [q, router]);
  return (
    <form className="search-box" role="search" onSubmit={(e) => e.preventDefault()}>
      <SearchIcon />
      <input
        type="search"
        autoFocus
        placeholder="Takım, lig veya ülke ara"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
    </form>
  );
}

export function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
