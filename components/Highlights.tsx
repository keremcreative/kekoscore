"use client";

import { useState } from "react";
import type { Highlight } from "@/lib/highlights";

/**
 * Özet videosu: önce kapak resmi (sayfa hafif kalsın), dokununca YouTube oynatıcısı sayfada açılır.
 * Kanal bölgeye ya da gömmeye kapalıysa "YouTube'da aç" ile uygulamada izlenir.
 */
export function Highlights({ items }: { items: Highlight[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  if (!items.length) return null;
  const v = items[Math.min(i, items.length - 1)];
  return (
    <section className="card hl-card">
      <div className="section-title">Maç özeti</div>
      <div className="hl-frame">
        {playing ? (
          <iframe
            key={v.videoId}
            src={`https://www.youtube-nocookie.com/embed/${v.videoId}?autoplay=1&playsinline=1&rel=0`}
            title={v.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button type="button" className="hl-thumb" onClick={() => setPlaying(true)} aria-label="Özeti oynat">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
            <span className="hl-play" aria-hidden>▶</span>
          </button>
        )}
      </div>
      <div className="hl-meta">
        <span className="hl-title">{v.title}</span>
        <span className="hl-sub">
          {v.channel} ·{" "}
          <a href={`https://www.youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noreferrer">
            YouTube&apos;da aç ›
          </a>
        </span>
      </div>
      {items.length > 1 && (
        <div className="hl-switch">
          {items.map((x, k) => (
            <button key={x.videoId} type="button" className={k === i ? "on" : ""} onClick={() => { setI(k); setPlaying(false); }}>
              {x.channel}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
