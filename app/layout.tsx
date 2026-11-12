import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TabBar } from "@/components/TabBar";
import { ServiceWorker } from "@/components/ServiceWorker";
import { RefreshButton } from "@/components/RefreshButton";
import { Ticker } from "@/components/Ticker";
import { TzSwitch } from "@/components/TzSwitch";
import { SearchIcon } from "@/components/SearchBox";
import { NotifPrompt } from "@/components/social/NotifPrompt";
import { initTz } from "@/lib/tz";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "kekoscore",
  description: "Reklamsız, sade canlı skor uygulaması",
  appleWebApp: { capable: true, title: "kekoscore", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0e1013",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tz = await initTz();
  return (
    <html lang="tr">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-mark" src="/icon.svg" alt="" width={28} height={28} /> kekoscore
          </Link>
          <RefreshButton />
          <Link href="/ara" className="top-search" aria-label="Ara">
            <SearchIcon />
          </Link>
          <Link href="/ayarlar" className="top-search" aria-label="Ayarlar">
            <GearIcon />
          </Link>
          <TzSwitch value={tz} />
        </header>
        <Suspense>
          <Ticker />
        </Suspense>
        <main className="wrap">{children}</main>
        <ServiceWorker />
        <NotifPrompt />
        {/* Ziyaretçi sayısı (Vercel Web Analytics): çerezsiz, kişiyi tanımaz */}
        <Analytics />
        <Suspense>
          <TabBar />
        </Suspense>
      </body>
    </html>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
