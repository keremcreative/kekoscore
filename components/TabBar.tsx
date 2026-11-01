"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const BallIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5l4 2.9-1.5 4.7h-5L8 10.4z" />
    <path d="M12 3v4.5M16 10.4l4.3-1.4M14.5 15.1l2.6 3.7M9.5 15.1l-2.6 3.7M8 10.4L3.7 9" />
  </svg>
);
const LiveIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" />
  </svg>
);
const TableIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
    <path d="M3.5 9h17M3.5 14.5h17M9 4v16" />
  </svg>
);

export function TabBar() {
  const path = usePathname();
  const live = useSearchParams().get("canli") === "1";
  const tabs = [
    { href: "/", label: "Maçlar", icon: <BallIcon />, on: (path === "/" && !live) || path.startsWith("/mac") },
    { href: "/?canli=1", label: "Canlı", icon: <LiveIcon />, on: path === "/" && live },
    { href: "/lig", label: "Ligler", icon: <TableIcon />, on: path.startsWith("/lig") },
  ];
  return (
    <nav className="tabbar" aria-label="Ana menü">
      {tabs.map((t) => (
        <Link key={t.label} href={t.href} className={t.on ? "on" : ""}>
          {t.icon}
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
