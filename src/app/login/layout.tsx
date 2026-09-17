import type { ReactNode } from "react";
import type { Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "../globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

export const metadata = {
  title: "Staff login | Al Najah Al Daem · Fixpoint",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#001a33",
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-full bg-sand text-ink antialiased">{children}</body>
    </html>
  );
}
