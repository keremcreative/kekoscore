import type { Team } from "@/lib/types";

export function TeamLogo({ team, size = 22 }: { team: Team; size?: number }) {
  if (team.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.logo} alt="" width={size} height={size} className="logo" loading="lazy" />;
  }
  return (
    <span className="logo logo-fallback" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {(team.abbr || team.short).slice(0, 3)}
    </span>
  );
}
