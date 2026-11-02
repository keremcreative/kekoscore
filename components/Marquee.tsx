"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const SPEED = 38; // px/sn: göz takip edebilsin

/** Bant: içerik kendiliğinden, sonsuz döngüde sola kayar. Dokununca durur. */
export function Marquee({ children, label }: { children: React.ReactNode; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const half = useRef<HTMLDivElement>(null);
  const [dur, setDur] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useLayoutEffect(() => {
    const measure = () => {
      const w = half.current?.offsetWidth ?? 0;
      const fits = w <= (box.current?.clientWidth ?? 0);
      setDur(fits ? 0 : w / SPEED);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (half.current) ro.observe(half.current);
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const hold = () => {
    clearTimeout(timer.current);
    setPaused(true);
  };
  const release = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPaused(false), 2500);
  };

  const moving = dur > 0;
  return (
    <div className={`ticker${moving ? " moving" : ""}${paused ? " paused" : ""}`} aria-label={label} ref={box} onTouchStart={hold} onTouchEnd={release} onTouchCancel={release}>
      <div className="ticker-track" style={moving ? { animationDuration: `${dur}s` } : undefined}>
        <div className="ticker-half" ref={half}>
          {children}
        </div>
        {moving && (
          <div className="ticker-half" aria-hidden inert>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
