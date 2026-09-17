/**
 * Editable website shell (header / footer / home).
 * Public site uses published documents; falls back to next-intl messages + siteConfig.
 */
import { cache } from "react";
import { prisma } from "@/server/db";
import { parseJson } from "@/lib/utils";

export const SITE_SHELL_SECTIONS = ["header", "footer", "home"] as const;
export type SiteShellSection = (typeof SITE_SHELL_SECTIONS)[number];

export type HeaderShell = {
  brandLabel?: string;
  quoteLabel?: string;
  aiLabel?: string;
  showAi?: boolean;
  showQuote?: boolean;
  /** Nav labels keyed by path key: services, diy, blog, faq, locations, reviews, contact */
  nav?: Record<string, string>;
};

export type FooterShell = {
  companyHeading?: string;
  contactHeading?: string;
  followHeading?: string;
  legalHeading?: string;
  rights?: string;
  licensesLine?: string;
  companyBlurb?: string;
};

export type HomeShell = {
  heroKicker?: string;
  heroTitle?: string;
  heroLead?: string;
  ctaQuote?: string;
  ctaAi?: string;
  stripCleaning?: string;
  stripMaintenance?: string;
  stripDiy?: string;
  stripCoverage?: string;
  unsureTitle?: string;
  unsureLead?: string;
  helpTitle?: string;
  helpLead?: string;
};

export type SiteShellPayload = HeaderShell | FooterShell | HomeShell;

export function emptyShell(section: SiteShellSection): SiteShellPayload {
  if (section === "header") return { showAi: true, showQuote: true, nav: {} };
  if (section === "footer") return {};
  return {};
}

export const getPublishedSiteShell = cache(async (section: SiteShellSection, locale: string) => {
  try {
    const row = await prisma.siteShellDocument.findUnique({ where: { section } });
    if (!row || row.status !== "published") return null;
    const raw = locale === "ar" ? row.payloadAr : row.payloadEn;
    const parsed = parseJson<SiteShellPayload>(raw, emptyShell(section));
    return parsed;
  } catch {
    return null;
  }
});

export async function getSiteShellAdmin(section: SiteShellSection) {
  const row = await prisma.siteShellDocument.findUnique({ where: { section } });
  return row;
}

export async function upsertSiteShellDraft(input: {
  section: SiteShellSection;
  payloadEn: string;
  payloadAr: string;
  updatedBy: string;
  publish: boolean;
}) {
  const data = {
    payloadEn: input.payloadEn,
    payloadAr: input.payloadAr,
    updatedBy: input.updatedBy,
    status: input.publish ? ("published" as const) : ("draft" as const),
    publishedAt: input.publish ? new Date() : undefined,
  };
  return prisma.siteShellDocument.upsert({
    where: { section: input.section },
    create: {
      section: input.section,
      ...data,
      publishedAt: input.publish ? new Date() : null,
    },
    update: data,
  });
}
