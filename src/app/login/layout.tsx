import type { ReactNode } from "react";
import type { Viewport } from "next";
import "../globals.css";

// Use the existing global system-font stack; no build-time font download.

export const metadata = {
  title: "Staff login | Al Najah Al Daem · Fixpoint",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/favicon.ico?v=fixpoint-20261019", sizes: "any" },
      { url: "/media/brand/fixpoint-mark-64.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=fixpoint-20261019", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#001a33",
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-full bg-sand text-ink antialiased">{children}</body>
    </html>
  );
}
