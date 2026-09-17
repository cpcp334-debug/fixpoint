import { needPermission } from "@/lib/admin/guard";
import {
  AdminBulkTable,
  AdminCatalogEmptyHint,
  AdminFlash,
  AdminListSummary,
  AdminPreviewLinks,
  Forbidden,
  PageHeader,
} from "@/components/admin/Ui";
import { prisma } from "@/server/db";
import { loadDiyClassificationMatrix } from "@/lib/service-location/diy-matrix";
import { parseDiyProfileJson } from "@/lib/diy/profile-validate";
import type { ContentStatus, Prisma } from "@prisma/client";

const STATUSES: ContentStatus[] = ["draft", "review", "published", "archived"];

function sectionCompleteness(profileJson: string): string {
  const parsed = parseDiyProfileJson(profileJson);
  if (!parsed.value || !parsed.value.metadata.authored) return "shell";
  const p = parsed.value;
  const checks = [
    p.main.overview,
    p.main.canIDoIt,
    p.tools.tools.length > 0,
    p.steps.length >= 3,
    p.safety.stopConditions.length > 0,
    p.professional.professionalFallback,
    p.faq.length >= 5,
    p.aeo.whatIs,
  ];
  const ok = checks.filter(Boolean).length;
  return `${ok}/${checks.length}`;
}

export default async function DiyAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; ok?: string; error?: string }>;
}) {
  const auth = await needPermission("diy");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const matrix = loadDiyClassificationMatrix();
  const where: Prisma.DiyGuideWhereInput = {};
  if (query.status && (STATUSES as string[]).includes(query.status)) {
    where.status = query.status as ContentStatus;
  }
  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [
      { slug: { contains: q } },
      { translations: { some: { title: { contains: q } } } },
      { service: { is: { slug: { contains: q } } } },
    ];
  }
  const [totalGuides, matchingCount, publicGuides, guides] = await Promise.all([
    prisma.diyGuide.count(),
    prisma.diyGuide.count({ where }),
    prisma.diyGuide.count({ where: { status: "published", indexable: true } }),
    prisma.diyGuide.findMany({
      where,
      include: {
        translations: { where: { locale: "en" }, take: 1 },
        service: { include: { category: true } },
      },
      orderBy: { slug: "asc" },
      take: 500,
    }),
  ]);
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.status) sp.set("status", query.status);
  const returnTo = `/admin/diy${sp.toString() ? `?${sp}` : ""}`;

  return (
    <div>
      <PageHeader
        title="DIY / profiles"
        note="Bulk uses ContentStatus on DiyGuide. Publish = published+indexable; Hide = draft+noindex; Soft-remove = archived."
      />
      <AdminFlash ok={query.ok} error={query.error} />
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input
          name="q"
          defaultValue={query.q || ""}
          placeholder="Search slug, title, or service"
          className="min-w-48 rounded-md border border-line px-3 py-2"
        />
        <select name="status" defaultValue={query.status || ""} className="rounded-md border border-line px-3 py-2">
          <option value="">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-line px-3 py-2">
          Filter
        </button>
      </form>
      <AdminCatalogEmptyHint
        total={totalGuides}
        noun="DIY guides"
        steps="Run npm run db:diy-publish-454 after services exist in the database."
      />
      <AdminListSummary
        noun="DIY guides"
        total={totalGuides}
        matching={matchingCount}
        showing={guides.length}
        stats={[{ label: "public (published + indexable)", value: publicGuides }]}
      />
      <AdminBulkTable
        entity="diy"
        returnTo={returnTo}
        headers={["Guide", "Service", "Matrix", "Status", "Indexable", "Profile", "Completeness", ""]}
        rows={guides.map((guide) => {
          const serviceSlug = guide.service?.slug || "—";
          const m = guide.service?.slug ? matrix.bySlug.get(guide.service.slug) : undefined;
          const profile = parseDiyProfileJson(guide.profileJson).value;
          const completeness =
            m?.diyStatus === "GREEN" ? sectionCompleteness(guide.profileJson) : profile?.metadata.authored ? sectionCompleteness(guide.profileJson) : "—";
          return {
            id: guide.id,
            cells: [
              guide.translations[0]?.title || guide.slug,
              serviceSlug,
              m?.diyStatus || "—",
              guide.status,
              guide.indexable ? "yes" : "no",
              guide.profileStatus,
              completeness,
            <span key="actions" className="inline-flex flex-col gap-1">
              <a className="text-navy" href={`/admin/diy/${guide.id}`}>
                Open
              </a>
              <AdminPreviewLinks enPath={`/diy/${guide.slug}`} />
            </span>,
            ],
          };
        })}
        emptyNote="No DIY guides match."
      />
    </div>
  );
}
