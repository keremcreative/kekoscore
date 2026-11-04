import type { League } from "@/lib/leagues";
import type { LeagueLogo } from "@/lib/types";

/** Lig logosu (temaya göre açık/koyu); logo yoksa bayrak */
export function LeagueIcon({ league, logo, size = 20 }: { league: League; logo?: LeagueLogo; size?: number }) {
  if (!logo?.light && !logo?.dark) return <span style={{ fontSize: size * 0.9, lineHeight: 1 }}>{league.flag}</span>;
  return (
    <picture className="league-logo" style={{ width: size, height: size }}>
      {logo.dark && <source srcSet={logo.dark} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo.light ?? logo.dark} alt="" width={size} height={size} />
    </picture>
  );
}
