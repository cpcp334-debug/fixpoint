import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { siteConfig, whatsappUrl } from "@/config/site";
import { getActiveEmirates, getActiveServices, getGlobalFaqs, getPublishedGuides } from "@/lib/catalog";
import { summarizeApprovedServiceReviews } from "@/lib/reviews";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd, localBusinessJsonLd, organizationJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { AiPanel } from "@/components/ai/AiPanel";
import { FaqList } from "@/components/ui/Blocks";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, Section, SectionHeader } from "@/components/ui/Section";
import { Hero } from "@/components/home/Hero";
import { DiyCard, LocationCard, ProblemCard, ServiceCard } from "@/components/home/Cards";
import { ProblemChips } from "@/components/home/ProblemChips";
import {
  IconBook,
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
  IconWrench,
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
  const chips = [
    { label: t("chipAc"), prompt: t("promptAc") },
    { label: t("chipLeak"), prompt: t("promptLeak") },
    { label: t("chipPaint"), prompt: t("promptPaint") },
    { label: t("chipSink"), prompt: t("promptSink") },
    { label: t("chipWall"), prompt: t("promptWall") },
    { label: t("chipClean"), prompt: t("promptClean") },
  ];
  const problems = [
    { title: t("problemCooling"), href: "/ac-maintenance", icon: IconWind },
    { title: t("problemLeak"), href: "/plumbing-maintenance", icon: IconDroplet },
    { title: t("problemElectrical"), href: "/electrical-maintenance", icon: IconBolt },
    { title: t("problemPainting"), href: "/painting-services", icon: IconBrush },
    { title: t("problemWall"), href: "/wall-maintenance", icon: IconWall },
    { title: t("problemPlumbing"), href: "/plumbing-maintenance", icon: IconPipe },
    { title: t("problemCleaning"), href: "/cleaning-services", icon: IconSparkClean },
  ];
  const trustStrip = [
    { icon: IconSparkClean, label: t("stripCleaning") },
    { icon: IconWrench, label: t("stripMaintenance") },
    { icon: IconSparkle, label: t("stripAi") },
    { icon: IconBook, label: t("stripDiy") },
    { icon: IconUsers, label: t("stripHuman") },
    { icon: IconMap, label: t("stripCoverage") },
  ];
  const why = [1, 2, 3, 4, 5, 6] as const;

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
          floatTitle: t("heroFloatTitle"),
          floatBody: t("heroFloatBody"),
        }}
      />

      <div className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-6">
          {trustStrip.map((item) => (
            <p key={item.label} className="flex items-center gap-2 text-sm text-navy">
              <item.icon className="h-4 w-4 shrink-0 text-gold" />
              {item.label}
            </p>
          ))}
        </div>
      </div>

      <Section tone="sand">
        <SectionHeader title={t("unsureTitle")} lead={t("unsureLead")} />
        <div className="mt-8">
          <ProblemChips chips={chips} hint={t("chipHint")} />
        </div>
        <div id="alnajah-ai" className="mt-10 scroll-mt-28">
          <AiPanel locale={locale} />
        </div>
      </Section>

      <Section>
        <SectionHeader title={t("helpTitle")} lead={t("helpLead")} />
        <div className="mt-10">
          <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-gold">{t("groupCleaning")}</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {featured
              .filter((s) => s.slug === "cleaning-services")
              .map((service) => (
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
                  featured
                />
              ))}
          </div>
          <h3 className="mt-10 text-sm font-medium uppercase tracking-[0.14em] text-gold">{t("groupMaintenance")}</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {featured
              .filter((s) => s.slug === "building-maintenance")
              .map((service) => (
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
                  featured
                />
              ))}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((service) => (
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
              />
            ))}
          </div>
        </div>
      </Section>

      <Section tone="sand">
        <SectionHeader title={t("problemTitle")} lead={t("problemLead")} />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {problems.map((problem) => (
            <ProblemCard key={problem.title} {...problem} />
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader title={t("diyTitle")} lead={t("diyLead")} />
        {guides.length ? (
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
        ) : (
          <div className="mt-8">
            <EmptyState body={t("diyEmpty")} />
          </div>
        )}
        <p className="mt-8 text-sm text-muted">
          {t("diyFallback")}{" "}
          <Link href="/get-a-quote" className="font-medium text-accent">
            {t("ctaQuote")}
          </Link>
        </p>
      </Section>

      <Section tone="sand">
        <SectionHeader title={t("whyTitle")} lead={t("whyLead")} />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {why.map((n) => (
            <li key={n} className="rounded-[16px] bg-white p-5">
              <h3 className="font-semibold text-navy">{t(`why${n}Title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(`why${n}Body`)}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionHeader title={t("howTitle")} lead={t("howLead")} />
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <li key={n}>
              <p className="text-[0.75rem] font-medium tracking-[0.14em] text-gold">{String(n).padStart(2, "0")}</p>
              <p className="mt-2 font-medium text-navy">{t(`how${n}`)}</p>
            </li>
          ))}
        </ol>
      </Section>

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

      <Section>
        <SectionHeader title={t("credentialsTitle")} lead={t("credentialsLead")} />
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {siteConfig.licenses.map((lic) => (
            <li key={lic.licenseNo} className="rounded-[16px] border border-line/80 p-5">
              <p className="font-semibold text-navy">{locale === "ar" ? lic.emirateAr : lic.emirate}</p>
              <p className="mt-1 text-sm text-muted">{lic.activity}</p>
              <p className="mt-2 text-sm">{lic.licenseNo}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <Link href="/about" className="font-medium text-accent">
            {t("credentialsLink")}
          </Link>
        </p>
      </Section>

      <Section tone="sand">
        {reviewStats.count && reviewStats.average != null ? (
          <div>
            <SectionHeader title={t("reviewsTitle")} />
            <p className="mt-4 text-muted">{t("reviewsBasedOn", { count: reviewStats.count })}</p>
            <p className="mt-3">
              <Link href="/reviews" className="font-medium text-accent">
                {t("reviewsTitle")}
              </Link>
            </p>
          </div>
        ) : (
          <EmptyState title={t("reviewsTitle")} body={t("reviewsEmpty")} />
        )}
      </Section>

      <Section>
        <SectionHeader title={t("qaTitle")} lead={t("qaLead")} />
        <div className="mt-6">
          <FaqList items={faqs} />
        </div>
      </Section>

      <Section tone="navy">
        <h2 className="max-w-xl text-[1.75rem] font-semibold leading-tight text-white">{t("ctaTitle")}</h2>
        <p className="mt-3 max-w-xl text-white/75">{t("ctaBody")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/get-a-quote" variant="inversePrimary">
            {t("ctaQuote")}
          </ButtonLink>
          <ButtonLink href="#alnajah-ai" variant="inverse" external>
            {t("ctaAi")}
          </ButtonLink>
          <ButtonLink href={whatsappUrl()} variant="inverse" external>
            {cta("whatsapp")}
          </ButtonLink>
        </div>
      </Section>
    </div>
  );
}
