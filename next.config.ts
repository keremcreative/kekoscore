import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  poweredByHeader: false,
  experimental: {
    // Sekmeler arası geri dönüşte sayfa 30 sn boyunca telefondaki kopyadan anında açılır;
    // canlı maç varken sayfalar zaten kendini yeniliyor (AutoRefresh).
    staleTimes: { dynamic: 30, static: 300 },
  },
};

export default nextConfig;
