import Link from "next/link";
import type { Team } from "@/lib/types";

/** Takım adını/logosunu takım sayfasına bağlar */
export function TeamLink({ team, league, className, children }: { team: Team; league: string; className?: string; children: React.ReactNode }) {
  if (!team.id) return <span className={className}>{children}</span>;
  return (
    <Link href={`/takim/${league}/${team.id}`} className={className}>
      {children}
    </Link>
  );
}
