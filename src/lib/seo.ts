import type { Metadata } from "next";
import { getSiteUrl } from "@/config/site";

export function buildMetadata(opts: {
  locale: string;
  title: string;
  description: string;
  path: string;
  index?: boolean;
  ogType?: "website" | "article";
  /** When set, only these locale alternates are emitted (hreflang). */
  languages?: Record<string, string>;
}): Metadata {
  const site = getSiteUrl();
  const canonical = `${site}/${opts.locale}${opts.path === "/" ? "" : opts.path}`;
  const index = opts.index !== false;
  const languages =
    opts.languages ??
    ({
      en: `${site}/en${opts.path === "/" ? "" : opts.path}`,
      ar: `${site}/ar${opts.path === "/" ? "" : opts.path}`,
    } satisfies Record<string, string>);

  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      canonical,
      languages,
    },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: canonical,
      siteName: "ALNAJAH ALDAEM",
      locale: opts.locale === "ar" ? "ar_AE" : "en_AE",
      type: opts.ogType ?? "website",
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
    },
  };
}

export type FaqItem = { q: string; a: string };

export function organizationJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ALNAJAH ALDAEM",
    url: site,
    email: "alnajahaldaem42@gmail.com",
    telephone: "+971543447959",
    areaServed: "AE",
    description:
      "Cleaning and building maintenance services in the United Arab Emirates.",
  };
}

export function localBusinessJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "ALNAJAH ALDAEM",
    url: site,
    telephone: "+971543447959",
    email: "alnajahaldaem42@gmail.com",
    address: {
      "@type": "PostalAddress",
      addressCountry: "AE",
    },
    areaServed: [
      "Dubai",
      "Abu Dhabi",
      "Sharjah",
      "Ajman",
      "Umm Al Quwain",
      "Ras Al Khaimah",
      "Fujairah",
    ],
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>, locale: string) {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${site}/${locale}${item.path === "/" ? "" : item.path}`,
    })),
  };
}

export function faqJsonLd(items: FaqItem[]) {
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function serviceJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  locale: string;
}) {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    provider: { "@type": "Organization", name: "ALNAJAH ALDAEM" },
    areaServed: "AE",
    url: `${site}/${opts.locale}${opts.path}`,
  };
}

export function howToJsonLd(opts: {
  name: string;
  description: string;
  steps: string[];
}) {
  if (opts.steps.length < 2) return null;
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: opts.name,
    description: opts.description,
    step: opts.steps.map((text, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      text,
    })),
  };
}

export function reviewAggregateJsonLd(opts: {
  name: string;
  path: string;
  locale: string;
  average: number;
  count: number;
  reviews: Array<{ authorName: string; stars: number; body: string }>;
}) {
  if (!opts.count || !opts.reviews.length) return null;
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "ALNAJAH ALDAEM",
    url: `${site}/${opts.locale}${opts.path}`,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: opts.average.toFixed(1),
      reviewCount: opts.count,
      bestRating: "5",
      worstRating: "1",
    },
    review: opts.reviews.slice(0, 10).map((review) => ({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: review.stars, bestRating: "5", worstRating: "1" },
      author: { "@type": "Person", name: review.authorName },
      reviewBody: review.body,
    })),
  };
}

export function collectionPageJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  locale: string;
}) {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: `${site}/${opts.locale}${opts.path}`,
  };
}

export function blogPostingJsonLd(opts: {
  title: string;
  description: string;
  path: string;
  locale: string;
  image?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
}) {
  const site = getSiteUrl();
  const url = `${site}/${opts.locale}${opts.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: opts.title,
    description: opts.description,
    url,
    mainEntityOfPage: url,
    inLanguage: opts.locale === "ar" ? "ar" : "en",
    image: opts.image ? `${site}${opts.image}` : undefined,
    datePublished: opts.datePublished || undefined,
    dateModified: opts.dateModified || undefined,
    author: { "@type": "Organization", name: "ALNAJAH ALDAEM" },
    publisher: { "@type": "Organization", name: "ALNAJAH ALDAEM", url: site },
  };
}
