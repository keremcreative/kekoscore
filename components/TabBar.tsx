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

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5z" />
    <path d="M8.5 8.5h7M8.5 11.5h4.5" />
  </svg>
);

export function TabBar() {
  const path = usePathname();
  const live = useSearchParams().get("canli") === "1";
  const tabs = [
    { href: "/", label: "Maçlar", icon: <BallIcon />, on: (path === "/" && !live) || path.startsWith("/mac") },
    { href: "/?canli=1", label: "Canlı", icon: <LiveIcon />, on: path === "/" && live },
    { href: "/lig", label: "Ligler", icon: <TableIcon />, on: path.startsWith("/lig") || path.startsWith("/takim") },
    { href: "/sohbet", label: "Sohbet", icon: <ChatIcon />, on: path.startsWith("/sohbet") },
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
