import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { getActiveEmirates, getActiveServices, getGlobalFaqs, getPublishedGuides } from "@/lib/catalog";
import { summarizeApprovedServiceReviews } from "@/lib/reviews";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd, localBusinessJsonLd, organizationJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { FaqList } from "@/components/ui/Blocks";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Hero } from "@/components/home/Hero";
import { DiyCard, LocationCard, ProblemCard, ServiceCard } from "@/components/home/Cards";
import { ProblemChips } from "@/components/home/ProblemChips";
import { CtaBand } from "@/components/public/CtaBand";
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
  const emirates = await getActiveEmirates(locale);
  const guides = await getPublishedGuides(locale);
  const faqs = await getGlobalFaqs(locale);
  const reviewStats = await summarizeApprovedServiceReviews({});
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
  const trustStrip = [
    { icon: IconSparkClean, label: t("stripCleaning") },
    { icon: IconSparkle, label: t("stripAi") },
    { icon: IconUsers, label: t("stripHuman") },
    { icon: IconMap, label: t("stripCoverage") },
  ];

  function renderService(service: (typeof services)[number], featuredCard?: boolean) {
    return (
      <ServiceCard
        key={service.slug}
        slug={service.slug}
        name={service.t.name}
        description={service.t.shortDescription}
        benefit={serviceBenefit(service, t)}
        cta={t("viewService")}
        diyLabel={service.diyAvailable ? t("chipDiy") : undefined}
        amcLabel={service.amcAvailable ? t("chipAmc") : undefined}
        emergencyLabel={service.emergencyAvailable ? t("chipEmergency") : undefined}
        featured={featuredCard}
      />
    );
  }

  return (
    <div>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={localBusinessJsonLd()} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }], locale)} />
      <JsonLd data={faqJsonLd(faqs)} />

      <Hero
        locale={locale}
        copy={{
          kicker: t("heroKicker"),
          title: t("heroTitle"),
          lead: t("heroLead"),
          quote: t("ctaQuote"),
          ai: t("ctaAi"),
          whatsapp: nav("whatsapp"),
          share: t("share"),
          copied: t("copied"),
        }}
      />

      <div className="border-b border-line bg-sand/60">
        <div className="mx-auto grid max-w-6xl gap-2 px-4 py-3 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {trustStrip.map((item) => (
            <p key={item.label} className="flex items-center gap-2 text-sm text-navy">
              <item.icon className="h-4 w-4 shrink-0 text-gold" />
              {item.label}
            </p>
          ))}
        </div>
      </div>

      <Section>
        <SectionHeader title={t("unsureTitle")} lead={t("unsureLead")} />
        <div className="mt-4">
          <ProblemChips chips={chips} hint={t("chipHint")} />
        </div>
      </Section>

      {services.length ? (
        <Section tone="sand">
          <SectionHeader title={t("helpTitle")} lead={t("helpLead")} />
          <div className="mt-8 space-y-8">
            {cleaning.length ? (
              <div>
                <h3 className="text-sm font-medium text-muted">{t("groupCleaning")}</h3>
                <div className="mt-3 grid gap-4 md:grid-cols-2">{cleaning.map((service) => renderService(service, true))}</div>
              </div>
            ) : null}
            {maintenance.length ? (
              <div>
                <h3 className="text-sm font-medium text-muted">{t("groupMaintenance")}</h3>
                <div className="mt-3 grid gap-4 md:grid-cols-2">{maintenance.map((service) => renderService(service, true))}</div>
              </div>
            ) : null}
            {rest.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rest.map((service) => renderService(service))}</div>
            ) : null}
          </div>
        </Section>
      ) : null}

      <Section>
        <SectionHeader title={t("problemTitle")} lead={t("problemLead")} />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {problems.map((problem) => (
            <ProblemCard key={problem.title} {...problem} />
          ))}
        </div>
      </Section>

      {guides.length ? (
        <Section tone="sand">
          <SectionHeader title={t("diyTitle")} lead={t("diyLead")} />
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {guides.map((guide) => (
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
        </Section>
      ) : null}

      <Section>
        <SectionHeader title={t("whyTitle")} />
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {whyItems.map((item) => (
            <li
              key={item.n}
              className={`rounded-2xl border p-5 transition-colors hover:border-accent/40 ${item.surface}`}
            >
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${item.badge}`}>
                <item.icon className="h-4 w-4" />
              </span>
              <h3 className="mt-4 font-semibold tracking-tight text-navy">{t(`why${item.n}Title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(`why${item.n}Body`)}</p>
            </li>
          ))}
        </ul>
        <ol className="mt-10 grid gap-4 border-t border-line pt-10 sm:grid-cols-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <li key={n} className="rounded-2xl border border-[#bfdbfe]/70 bg-[#f8fbff] p-4">
              <p className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                {String(n).padStart(2, "0")}
              </p>
              <p className="mt-3 text-sm font-semibold leading-snug text-navy">{t(`how${n}`)}</p>
            </li>
          ))}
        </ol>
      </Section>

      {emirates.length ? (
        <Section tone="sand">
          <SectionHeader title={t("areasTitle")} lead={t("areasLead")} />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            {emirates.map((em) => (
              <li key={em.slug}>
                <LocationCard slug={em.slug} name={em.t.name} note={t("areaEnquiry")} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section>
        <SectionHeader title={t("credentialsTitle")} />
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {siteConfig.licenses.map((lic) => (
            <li key={lic.licenseNo} className="rounded-xl border border-line p-5">
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
        <Section tone="sand">
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
        <Section>
          <SectionHeader title={t("qaTitle")} lead={t("qaLead")} />
          <div className="mt-6">
            <FaqList items={faqs} />
          </div>
        </Section>
      ) : null}

      <CtaBand title={t("ctaTitle")} body={t("ctaBody")} quote={t("ctaQuote")} ai={t("ctaAi")} whatsapp={cta("whatsapp")} />
    </div>
  );
}
