import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TabBar } from "@/components/TabBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "kekoscore",
  description: "Reklamsız, sade canlı skor uygulaması",
  appleWebApp: { capable: true, title: "kekoscore", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e1013" },
    { media: "(prefers-color-scheme: light)", color: "#f4f2ee" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden>◐</span> kekoscore
          </Link>
        </header>
        <main className="wrap">{children}</main>
        <Suspense>
          <TabBar />
        </Suspense>
      </body>
    </html>
  );
}
