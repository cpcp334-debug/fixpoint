import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { getActiveServices, getGlobalFaqs, getPublishedGuides } from "@/lib/catalog";
import { buildVisitorNavTree } from "@/lib/catalog/approved-nav";
import { summarizeApprovedServiceReviews } from "@/lib/reviews";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd, localBusinessJsonLd, organizationJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { FaqList } from "@/components/ui/Blocks";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Hero } from "@/components/home/Hero";
import { DiyCard, ProblemCard } from "@/components/home/Cards";
import { HelpServices } from "@/components/home/HelpServices";
import { MainCategoryCard } from "@/components/catalog/MainCategoryCard";
import { TopElectricalServices } from "@/components/catalog/TopElectricalServices";
import { ProblemChips } from "@/components/home/ProblemChips";
import { HomePlaces } from "@/components/home/HomePlaces";
import { publishedHomeLocationGroups } from "@/lib/locations/public-filter";
import { CtaBand } from "@/components/public/CtaBand";
import { ButtonLink } from "@/components/ui/Button";
import { getPublishedSiteShell, type HomeShell } from "@/lib/site-shell";
import {
  IconBolt,
  IconBrush,
  IconCheck,
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

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const nav = await getTranslations("Nav");
  const services = await getActiveServices(locale);
  const guides = await getPublishedGuides(locale);
  const homeGuides = [...guides]
    .sort((a, b) => {
      const rank = (risk: string) => (risk === "green" ? 0 : risk === "yellow" ? 1 : 2);
      return rank(a.riskLevel) - rank(b.riskLevel);
    })
    .slice(0, 4);
  const faqs = await getGlobalFaqs(locale);
  const reviewStats = await summarizeApprovedServiceReviews({});
  const homeShell = (await getPublishedSiteShell("home", locale)) as HomeShell | null;
  const mainCategories = buildVisitorNavTree();
  const featured = FEATURED.map((slug) => services.find((s) => s.slug === slug)).filter(Boolean) as typeof services;
  const rest = services.filter((s) => !FEATURED.includes(s.slug));
  const cleaning = featured.filter((s) => s.slug === "cleaning-services");
  const maintenance = featured.filter((s) => s.slug === "building-maintenance");
  const chips = [
    { label: t("chipAc"), prompt: t("promptAc") },
    { label: t("chipLeak"), prompt: t("promptLeak") },
    { label: t("chipPaint"), prompt: t("promptPaint") },
    { label: t("chipSink"), prompt: t("promptSink") },
    { label: t("chipWall"), prompt: t("promptWall") },
    { label: t("chipClean"), prompt: t("promptClean") },
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
  const whyItems = [
    { n: 1 as const, icon: IconCheck, surface: "bg-sand border-gold/25", badge: "bg-navy text-gold" },
    { n: 2 as const, icon: IconSparkle, surface: "bg-[#f3efe6] border-gold/30", badge: "bg-navy text-gold" },
    { n: 3 as const, icon: IconUsers, surface: "bg-sand-2 border-line", badge: "bg-navy text-gold" },
  ];

  return (
    <div>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={localBusinessJsonLd()} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }], locale)} />
      <JsonLd data={faqJsonLd(faqs.slice(0, 8))} />

      <Hero
        locale={locale}
        copy={{
          kicker: homeShell?.heroKicker?.trim() || t("heroKicker"),
          title: homeShell?.heroTitle?.trim() || t("heroTitle"),
          lead: homeShell?.heroLead?.trim() || t("heroLead"),
          quote: homeShell?.ctaQuote?.trim() || t("ctaQuote"),
          ai: homeShell?.ctaAi?.trim() || t("ctaAi"),
          whatsapp: nav("whatsapp"),
          share: t("share"),
          copied: t("copied"),
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
              <MainCategoryCard category={cat} locale={locale} />
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
        <Section className="!py-3 sm:!py-4">
          <SectionHeader
            title={homeShell?.helpTitle?.trim() || t("helpTitle")}
            lead={homeShell?.helpLead?.trim() || t("helpLead")}
          />
          <HelpServices
            items={[...featured, ...rest].slice(0, 4).map((service) => ({
              slug: service.slug,
              name: service.t.name,
              description: service.t.shortDescription,
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

      <Section className="!py-3 sm:!py-4">
        <TopElectricalServices
          locale={locale}
          title={locale === "ar" ? "خدمات الكهرباء للبدء" : "Electrical services to start with"}
          lead={
            locale === "ar"
              ? "إذا كان العطل كهربائياً، ابدأ بالخدمة الأقرب: فحص، تحديد عطل، مقبس، مفتاح، إنارة، تمديدات، أو لوحة التوزيع."
              : "If the fault is electrical, start with the closest service: inspection, fault finding, a socket, a switch, a light, wiring, or the distribution board."
          }
          cta={t("viewService")}
        />
      </Section>

      <Section className="!py-3 sm:!py-4">
        <SectionHeader title={t("problemTitle")} lead={t("problemLead")} />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {problems.map((problem) => (
            <ProblemCard key={problem.title} {...problem} />
          ))}
        </div>
      </Section>

      {guides.length ? (
        <Section tone="sand" className="!py-3 sm:!py-4">
          <SectionHeader title={t("diyTitle")} lead={t("diyLead")} />
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {homeGuides.map((guide) => (
              <li key={guide.slug}>
                <DiyCard
                  slug={guide.slug}
                  title={guide.t.title}
                  category={guide.categoryT?.name}
                  difficulty={guide.t.difficulty || guide.difficulty}
                  time={guide.t.estimatedTime || guide.estimatedTime}
                  summary={guide.t.quickAnswer}
                  cta={t("readGuide")}
                />
              </li>
            ))}
          </ul>
          {guides.length > 4 ? (
            <div className="mt-3">
              <ButtonLink href="/diy" variant="secondary">
                {t("diyMore")}
              </ButtonLink>
            </div>
          ) : null}
        </Section>
      ) : null}

      <Section className="!py-3 sm:!py-4">
        <SectionHeader title={t("whyTitle")} />
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {whyItems.map((item) => (
            <li
              key={item.n}
              className={`pass rounded-xl border p-3 transition-colors hover:border-accent/40 ${item.surface}`}
            >
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${item.badge}`}>
                <item.icon className="h-4 w-4" />
              </span>
              <h3 className="mt-2 font-semibold tracking-tight text-navy">{t(`why${item.n}Title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(`why${item.n}Body`)}</p>
            </li>
          ))}
        </ul>
        <ol className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <li key={n} className="pass rounded-xl border border-[#bfdbfe]/70 bg-[#f8fbff] p-3">
              <p className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                {String(n).padStart(2, "0")}
              </p>
              <p className="mt-3 text-sm font-semibold leading-snug text-navy">{t(`how${n}`)}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="sand" id="locations" className="!py-3 sm:!py-4">
        <SectionHeader title={t("areasTitle")} lead={t("areasLead")} />
        <div className="mt-3">
          <HomePlaces
            groups={(await publishedHomeLocationGroups(locale)).map((g) => ({
              slug: g.slug,
              name: g.name,
              count: g.count,
              // Omit place rows from homepage HTML/RSC (mobile weight); directories on /locations.
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

      <Section className="!py-3 sm:!py-4">
        <SectionHeader title={t("credentialsTitle")} />
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {siteConfig.licenses.map((lic) => (
            <li key={lic.licenseNo} className="pass rounded-xl border border-line p-3">
              <p className="font-semibold text-navy">{locale === "ar" ? lic.emirateAr : lic.emirate}</p>
              <p className="mt-1 text-sm text-muted">{lic.activity}</p>
              <p className="mt-2 text-sm tabular-nums">{lic.licenseNo}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <Link href="/about" className="font-medium text-accent">
            {t("credentialsLink")}
          </Link>
        </p>
      </Section>

      {reviewStats.count && reviewStats.average != null ? (
        <Section tone="sand" className="!py-3 sm:!py-4">
          <SectionHeader title={t("reviewsTitle")} />
          <p className="mt-4 text-muted">{t("reviewsBasedOn", { count: reviewStats.count })}</p>
          <p className="mt-3">
            <Link href="/reviews" className="font-medium text-accent">
              {t("reviewsTitle")}
            </Link>
          </p>
        </Section>
      ) : null}

      {faqs.length ? (
        <Section className="!py-3 sm:!py-4">
          <SectionHeader title={t("qaTitle")} lead={t("qaLead")} />
          <div className="mt-6">
            <FaqList items={faqs} />
          </div>
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
