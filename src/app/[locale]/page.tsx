import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getActiveServices, getGlobalFaqs } from "@/lib/catalog";
import { buildVisitorNavTree } from "@/lib/catalog/approved-nav";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd, localBusinessJsonLd, organizationJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { FaqList } from "@/components/ui/Blocks";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Hero } from "@/components/home/Hero";
import { ProblemCard } from "@/components/home/Cards";
import { HelpServices } from "@/components/home/HelpServices";
import { MainCategoryCard } from "@/components/catalog/MainCategoryCard";
import { ProblemChips } from "@/components/home/ProblemChips";
import { HomePlaces } from "@/components/home/HomePlaces";
import { publishedHomeLocationGroups } from "@/lib/locations/public-filter";
import { CtaBand } from "@/components/public/CtaBand";
import { getPublishedSiteShell, type HomeShell } from "@/lib/site-shell";
import {
  IconBolt,
  IconBrush,
  IconDroplet,
  IconMap,
  IconPipe,
  IconSparkClean,
  IconSparkle,
  IconUsers,
  IconWall,
  IconWind,
} from "@/components/ui/Icon";

const FEATURED = ["cleaning-services", "building-maintenance"];

function serviceBenefit(
  service: { diyAvailable: boolean; amcAvailable: boolean; inspectionRequired: boolean },
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  if (service.amcAvailable) return t("benefitAmc");
  if (service.diyAvailable) return t("benefitDiy");
  if (service.inspectionRequired) return t("benefitInspect");
  return t("benefitQuote");
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return buildMetadata({
    locale,
    title: t("homeTitle"),
    description: t("homeDescription"),
    path: "/",
  });
}

/**
 * Lean homepage for mobile PSI: keep hero + primary discovery,
 * defer deep catalogs (DIY, electrical strip, credentials) to their hubs.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const nav = await getTranslations("Nav");
  const services = await getActiveServices(locale);
  const faqs = await getGlobalFaqs(locale);
  const homeShell = (await getPublishedSiteShell("home", locale)) as HomeShell | null;
  const mainCategories = buildVisitorNavTree();
  const featured = FEATURED.map((slug) => services.find((s) => s.slug === slug)).filter(Boolean) as typeof services;
  const rest = services.filter((s) => !FEATURED.includes(s.slug));
  const chips = [
    { label: t("chipAc"), href: "/ac-maintenance" },
    { label: t("chipLeak"), href: "/plumbing-maintenance" },
    { label: t("chipPaint"), href: "/painting-services" },
    { label: t("chipSink"), href: "/plumbing-maintenance" },
    { label: t("chipWall"), href: "/wall-maintenance" },
    { label: t("chipClean"), href: "/cleaning-services" },
  ];
  const problems = [
    { title: t("problemCooling"), href: "/ac-maintenance", icon: IconWind, tone: "cool" as const },
    { title: t("problemLeak"), href: "/plumbing-maintenance", icon: IconDroplet, tone: "water" as const },
    { title: t("problemElectrical"), href: "/electrical-maintenance", icon: IconBolt, tone: "power" as const },
    { title: t("problemPainting"), href: "/painting-services", icon: IconBrush, tone: "paint" as const },
    { title: t("problemWall"), href: "/wall-maintenance", icon: IconWall, tone: "wall" as const },
    { title: t("problemPlumbing"), href: "/plumbing-maintenance", icon: IconPipe, tone: "pipe" as const },
    { title: t("problemCleaning"), href: "/cleaning-services", icon: IconSparkClean, tone: "clean" as const },
  ];

  return (
    <div>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={localBusinessJsonLd()} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }], locale)} />
      <JsonLd data={faqJsonLd(faqs.slice(0, 4))} />

      <Hero
        locale={locale}
        copy={{
          kicker: homeShell?.heroKicker?.trim() || t("heroKicker"),
          title: homeShell?.heroTitle?.trim() || t("heroTitle"),
          lead: homeShell?.heroLead?.trim() || t("heroLead"),
          quote: homeShell?.ctaQuote?.trim() || t("ctaQuote"),
          ai: homeShell?.ctaAi?.trim() || t("ctaAi"),
          whatsapp: nav("whatsapp"),
        }}
      />

      <div className="border-b border-line bg-sand/60">
        <div className="mx-auto grid max-w-6xl gap-1 px-4 py-2 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {[
            { icon: IconSparkClean, label: homeShell?.stripCleaning?.trim() || t("stripCleaning") },
            { icon: IconSparkle, label: t("stripAi") },
            { icon: IconUsers, label: t("stripHuman") },
            { icon: IconMap, label: homeShell?.stripCoverage?.trim() || t("stripCoverage") },
          ].map((item) => (
            <p key={item.label} className="pass flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-sm text-navy">
              <item.icon className="h-4 w-4 shrink-0 text-gold" />
              {item.label}
            </p>
          ))}
        </div>
      </div>

      <Section className="!py-3 sm:!py-4">
        <SectionHeader
          title={homeShell?.unsureTitle?.trim() || t("unsureTitle")}
          lead={homeShell?.unsureLead?.trim() || t("unsureLead")}
        />
        <div className="mt-4">
          <ProblemChips chips={chips} hint={t("chipHint")} />
        </div>
      </Section>

      <Section tone="sand" id="main-services" className="!py-3 sm:!py-4">
        <SectionHeader title={t("mainServicesTitle")} lead={t("mainServicesLead")} />
        <ul className="mt-3 grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mainCategories.map((cat) => (
            <li key={cat.slug} className="flex h-full">
              <MainCategoryCard category={cat} locale={locale} compact />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          <Link href="/services" className="font-medium text-accent">
            {t("browseAllServices")}
          </Link>
        </p>
      </Section>

      {services.length ? (
        <Section className="home-defer !py-3 sm:!py-4">
          <SectionHeader
            title={homeShell?.helpTitle?.trim() || t("helpTitle")}
            lead={homeShell?.helpLead?.trim() || t("helpLead")}
          />
          <HelpServices
            items={[...featured, ...rest].slice(0, 4).map((service) => ({
              slug: service.slug,
              name: service.t.name,
              description: "",
              benefit: serviceBenefit(service, t),
              diyLabel: service.diyAvailable ? t("chipDiy") : undefined,
              amcLabel: service.amcAvailable ? t("chipAmc") : undefined,
              emergencyLabel: service.emergencyAvailable ? t("chipEmergency") : undefined,
            }))}
            cta={t("viewService")}
            moreLabel={t("helpSeeMore")}
            lessLabel={t("helpSeeLess")}
          />
          {[...featured, ...rest].length > 4 ? (
            <p className="mt-3 text-sm">
              <Link href="/services" className="font-medium text-accent">
                {t("browseAllServices")}
              </Link>
            </p>
          ) : null}
        </Section>
      ) : null}

      <Section className="home-defer !py-3 sm:!py-4">
        <SectionHeader title={t("problemTitle")} lead={t("problemLead")} />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {problems.map((problem) => (
            <ProblemCard key={problem.title} {...problem} />
          ))}
        </div>
      </Section>

      <Section tone="sand" id="locations" className="home-defer !py-3 sm:!py-4">
        <SectionHeader title={t("areasTitle")} lead={t("areasLead")} />
        <div className="mt-3">
          <HomePlaces
            groups={(await publishedHomeLocationGroups(locale)).map((g) => ({
              slug: g.slug,
              name: g.name,
              count: g.count,
              places: [],
            }))}
            searchPlaceholder={t("placeSearch")}
            emptyLabel={t("placeEmpty")}
            openLabel={t("openEmirate")}
            moreLabel={t("placeMore")}
            lessLabel={t("placeLess")}
          />
        </div>
      </Section>

      <Section className="home-defer !py-3 sm:!py-4">
        <SectionHeader title={t("whyTitle")} />
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <li key={n} className="pass rounded-xl border border-line bg-sand/50 p-3">
              <h3 className="font-semibold tracking-tight text-navy">{t(`why${n}Title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(`why${n}Body`)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/diy" className="font-medium text-accent">
            {t("diyTitle")}
          </Link>
          <Link href="/about" className="font-medium text-accent">
            {t("credentialsLink")}
          </Link>
          <Link href="/reviews" className="font-medium text-accent">
            {t("reviewsTitle")}
          </Link>
        </p>
      </Section>

      {faqs.length ? (
        <Section className="home-defer !py-3 sm:!py-4">
          <SectionHeader title={t("qaTitle")} lead={t("qaLead")} />
          <div className="mt-6">
            <FaqList items={faqs.slice(0, 4)} />
          </div>
          <p className="mt-3 text-sm">
            <Link href="/faq" className="font-medium text-accent">
              {t("qaTitle")}
            </Link>
          </p>
        </Section>
      ) : null}

      <CtaBand
        title={t("ctaTitle")}
        body={t("ctaBody")}
        quote={t("ctaQuote")}
        ai={t("ctaAi")}
        whatsapp={cta("whatsapp")}
        className="!py-3 sm:!py-4"
        compact
      />
    </div>
  );
}
