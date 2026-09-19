import type { ReactNode } from "react";
import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { IBM_Plex_Sans_Arabic, Plus_Jakarta_Sans } from "next/font/google";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Tracker } from "@/components/analytics/Tracker";
import { DeferredAiWidget } from "@/components/ai/DeferredAiWidget";
import { getPublishedSiteShell, type HeaderShell } from "@/lib/site-shell";
import "../globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

/** Arabic is loaded only on /ar — never preload on EN (mobile LCP). */
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#001a33",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const headerShell = (await getPublishedSiteShell("header", locale)) as HeaderShell | null;

  const fontClass = locale === "ar" ? `${sans.variable} ${arabic.variable}` : sans.variable;

  return (
    <html lang={locale} dir={dir} className={fontClass}>
      <body className="min-h-full bg-white text-ink antialiased">
        <NextIntlClientProvider>
          <Header locale={locale} shell={headerShell} />
          <main id="main">{children}</main>
          <Footer locale={locale} />
          <DeferredAiWidget locale={locale} />
          <Tracker />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
