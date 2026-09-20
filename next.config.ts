import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { securityHeadersList } from "./src/server/security-headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  // Dev is opened as both localhost and 127.0.0.1. Without this, Next blocks
  // fonts and HMR from 127.0.0.1 and the page looks like a connection failure.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Hide the floating Next.js “N” Dev Tools badge (dev-only clutter in screenshots).
  devIndicators: false,
  serverExternalPackages: ["@prisma/client", "pdfkit", "exceljs"],
  experimental: {
    cpus: 1,
    workerThreads: false,
    // Tree-shake heavy barrels (fewer unused bytes on the public critical path).
    optimizePackageImports: ["next-intl"],
    // Do NOT enable inlineCss — Next 16.3 can triple CSS into HTML/RSC and inflate TTFB.
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Prefer leaner defaults for mobile LCP (logo / heroes).
    qualities: [60, 70, 75],
  },
  async rewrites() {
    return [
      // Belt-and-suspenders with middleware rewrite (middleware must not 307 `/`).
      { source: "/", destination: "/en" },
      { source: "/sitemap.xml", destination: "/sitemap-index.xml" },
    ];
  },
  async headers() {
    const longCache = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    const headers = [
      {
        source: "/:path*",
        headers: securityHeadersList(process.env),
      },
      {
        source: "/media/:path*",
        headers: longCache,
      },
      {
        source: "/favicon.:ext(ico|png|jpg|jpeg|webp|svg)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        source: "/icon.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        source: "/apple-icon.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
    // Next already sets hashed static asset caching in production; only reinforce outside next/dev.
    if (process.env.NODE_ENV === "production") {
      headers.push({
        source: "/_next/static/:path*",
        headers: longCache,
      });
    }
    return headers;
  },
};

export default withNextIntl(nextConfig);