import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { EmptyState, Section } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ProjectsPage" });
  return buildMetadata({
    locale,
    title: `${t("title")} | ALNAJAH ALDAEM`,
    description: t("empty"),
    path: "/projects",
    index: false,
  });
}

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ProjectsPage");
  const nav = await getTranslations("Nav");
  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/projects", label: t("title") }]}
        />
      }
    >
      <Section>
        <h1 className="text-[2rem] font-semibold text-navy">{t("title")}</h1>
        <div className="mt-6">
          <EmptyState body={t("empty")} />
        </div>
      </Section>
    </PageShell>
  );
}
