"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const BallIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5l4 2.9-1.5 4.7h-5L8 10.4z" />
    <path d="M12 3v4.5M16 10.4l4.3-1.4M14.5 15.1l2.6 3.7M9.5 15.1l-2.6 3.7M8 10.4L3.7 9" />
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

const NewsIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3.5" y="4" width="14" height="16" rx="2" />
    <path d="M17.5 8h3v10a2 2 0 0 1-2 2h-1M7 8.5h7M7 12h7M7 15.5h4" />
  </svg>
);
const TargetIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);
const StarIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
  </svg>
);

export function TabBar() {
  const actual = usePathname();
  // Dokunulan sekme, sayfa gelmeden hemen seçili görünsün
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [actual]);
  const path = pending ?? actual;
  const tabs = [
    { href: "/", label: "Maçlar", icon: <BallIcon />, on: path === "/" || path.startsWith("/mac") },
    { href: "/lig", label: "Ligler", icon: <TableIcon />, on: path.startsWith("/lig") || path.startsWith("/takim") || path.startsWith("/oyuncu") },
    { href: "/haber", label: "Haberler", icon: <NewsIcon />, on: path.startsWith("/haber") },
    { href: "/tahmin", label: "Tahmin", icon: <TargetIcon />, on: path.startsWith("/tahmin") },
    { href: "/favoriler", label: "Favoriler", icon: <StarIcon />, on: path.startsWith("/favoriler") },
    { href: "/sohbet", label: "Sohbet", icon: <ChatIcon />, on: path.startsWith("/sohbet") },
  ];

  return (
    <nav className="tabbar" aria-label="Ana menü">
      {tabs.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className={t.on ? "on" : ""}
          aria-current={t.on ? "page" : undefined}
          onClick={() => t.href !== actual && setPending(t.href)}
        >
          <span className="tab-ico">{t.icon}</span>
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
