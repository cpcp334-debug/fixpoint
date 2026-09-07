import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { IBM_Plex_Sans } from "next/font/google";
import { getStaffSession } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/Ui";
import { logoutAction } from "@/app/admin/actions";
import "../globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin | ALNAJAH ALDAEM",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getStaffSession();
  if (!session) redirect("/login");
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-full bg-sand text-ink antialiased">
        <div className="flex min-h-screen">
          <AdminNav session={session} />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between border-b border-line bg-white px-6 py-3">
              <p className="text-sm text-muted">Internal operations — English</p>
              <form action={logoutAction}>
                <button type="submit" className="text-sm text-navy">
                  Sign out
                </button>
              </form>
            </header>
            <main className="flex-1 px-6 py-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
