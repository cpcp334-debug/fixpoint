import type { ReactNode } from "react";
import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Tracker } from "@/components/analytics/Tracker";
import { DeferredAiWidget } from "@/components/ai/DeferredAiWidget";
import { getPublishedSiteShell, type HeaderShell } from "@/lib/site-shell";
import "../globals.css";

/**
 * EN uses system UI fonts (zero webfont bytes on /en mobile LCP).
 * Arabic loads IBM Plex without preload so it never blocks EN.
 */
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

  return (
    <html lang={locale} dir={dir} className={locale === "ar" ? arabic.variable : undefined}>
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
