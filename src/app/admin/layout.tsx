import type { ReactNode } from "react";
import type { Viewport } from "next";
import { redirect } from "next/navigation";
import { IBM_Plex_Sans } from "next/font/google";
import { getStaffSession } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/Ui";
import { logoutAction } from "@/app/admin/actions";
import "../globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin | Al Najah Al Daem · Fixpoint",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#001a33",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getStaffSession();
  if (!session) redirect("/login");
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-full bg-sand text-ink antialiased">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <AdminNav session={session} />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 sm:px-6">
              <p className="text-sm text-muted">Internal operations — English</p>
              <form action={logoutAction}>
                <button type="submit" className="min-h-10 rounded-md px-2 text-sm text-navy">
                  Sign out
                </button>
              </form>
            </header>
            <main className="flex-1 overflow-x-auto px-4 py-5 sm:px-6 sm:py-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
