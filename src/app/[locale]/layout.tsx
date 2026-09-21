import type { ReactNode } from "react";
import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DeferredAiWidget } from "@/components/ai/DeferredAiWidget";
import { GoogleTagManager } from "@/components/analytics/GoogleTagManager";
import { DeferredPublicAnalytics } from "@/components/analytics/DeferredPublicAnalytics";
import { readGtmId } from "@/lib/analytics/gtm";
import { getPublishedSiteShell, type HeaderShell } from "@/lib/site-shell";
import "../globals.css";

/**
 * No next/font on the public locale shell.
 * EN: system UI stack only (zero webfont bytes / preloads on mobile LCP).
 * AR: system Arabic-capable stack via globals.css — avoids Google font CSS
 * and render-blocking woff2 on every locale (shared layout module).
 */

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
  const gtmId = readGtmId();

  return (
    <html lang={locale} dir={dir}>
      <head>
        {/* Sole LCP image preload — header mark; no font/CSS preloads. */}
        <link rel="preload" as="image" href="/media/logo-128.webp" type="image/webp" fetchPriority="high" />
        {/* Critical above-fold paint without waiting on the full Tailwind chunk chain. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `html,body{margin:0;background:#fff;color:#0b1726}body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Tahoma,sans-serif;line-height:1.55}html[dir=rtl] body{font-family:"Segoe UI",Tahoma,"Noto Naskh Arabic","Arabic Typesetting",sans-serif}.hero-atmosphere{background:linear-gradient(145deg,#000d1a 0%,#001a33 45%,#0a2744 100%);color:#fff}`,
          }}
        />
      </head>
      <body className="min-h-full bg-white text-ink antialiased">
        {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
        <NextIntlClientProvider>
          <Header locale={locale} shell={headerShell} />
          <main id="main">{children}</main>
          <Footer locale={locale} />
          <DeferredAiWidget locale={locale} />
          <DeferredPublicAnalytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}