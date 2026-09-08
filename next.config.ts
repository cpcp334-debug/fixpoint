import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { securityHeadersList } from "./src/server/security-headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "pdfkit", "exceljs"],
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeadersList(process.env),
      },
    ];
  },
};

export default withNextIntl(nextConfig);
