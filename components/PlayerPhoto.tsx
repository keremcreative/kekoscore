"use client";
import { useState } from "react";

/** Oyuncu fotoğrafı; yoksa baş harfler */
export function PlayerPhoto({ src, name, size = 88 }: { src?: string; name: string; size?: number }) {
  const [bad, setBad] = useState(!src);
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className="pphoto" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {bad ? initials : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setBad(true)} />
      )}
    </span>
  );
}
