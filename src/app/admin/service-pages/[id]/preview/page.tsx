import { notFound } from "next/navigation";
import Link from "next/link";
import { needPermission } from "@/lib/admin/guard";
import { Forbidden, PageHeader } from "@/components/admin/Ui";
import { resolveServiceLocationPreview } from "@/lib/service-location/page-resolve";
import { ServiceLocationView } from "@/components/service-location/ServiceLocationView";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  const { id } = await params;
  const { locale: raw } = await searchParams;
  const locale = raw === "ar" ? "ar" : "en";
  const model = await resolveServiceLocationPreview(id, locale);
  if (!model) return { robots: { index: false, follow: false } };
  return {
    ...buildMetadata({
      locale,
      title: `[Preview] ${model.seoTitle || model.content.h1 || id}`,
      description: model.metaDescription || "Staff preview — not indexed.",
      path: model.path,
      index: false,
      languages: {},
    }),
    robots: { index: false, follow: false },
  };
}

export default async function ServiceLocationStaffPreview({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  const auth = await needPermission("services");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const { locale: raw } = await searchParams;
  const locale = raw === "ar" ? "ar" : "en";
  const model = await resolveServiceLocationPreview(id, locale);
  if (!model) notFound();

  return (
    <div>
      <PageHeader
        title="Staff page preview"
        note="Authorized preview only. Draft/pending allowed here. Never public. noindex."
        actions={
          <div className="flex flex-wrap gap-3 text-sm">
            <Link className="text-navy" href={`/admin/service-pages/${id}`}>
              Metadata
            </Link>
            <Link className="text-navy" href={`/admin/service-pages/${id}/preview?locale=en`}>
              EN
            </Link>
            <Link className="text-navy" href={`/admin/service-pages/${id}/preview?locale=ar`}>
              AR
            </Link>
            <Link className="text-navy" href="/admin/service-pages">
              Back
            </Link>
          </div>
        }
      />
      <ServiceLocationView
        model={model}
        labels={{
          breadcrumb: "Breadcrumb",
          home: "Home",
          local: "Local",
          overview: "Overview",
          faq: "FAQ",
          aeo: "Quick answers",
          diy: "DIY guide",
          geo: "Area context",
          relatedServices: "Related services",
          relatedLocations: "Related areas",
          quote: "Get a quote",
          book: "Book",
          inspect: "Inspect",
          whatsapp: "WhatsApp",
          call: "Call",
          share: "Share",
          copied: "Copied",
          ctaTitle: "Need help?",
          ctaBody: "Request a quote or message us on WhatsApp.",
          ctaQuote: "Get a quote",
          ctaAi: "Ask AI",
          emergency: "Emergency",
          amc: "AMC",
          previewBanner: `PREVIEW · ${locale.toUpperCase()} · noindex · coverage=${model.gates.eligible ? "eligible" : "not eligible"} · DIY=${model.diy.safetyClass}`,
        }}
      />
    </div>
  );
}
