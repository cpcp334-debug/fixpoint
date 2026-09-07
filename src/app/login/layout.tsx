import type { ReactNode } from "react";
import { IBM_Plex_Sans } from "next/font/google";
import "../globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "Staff login | ALNAJAH ALDAEM",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-full bg-sand text-ink antialiased">{children}</body>
    </html>
  );
}
