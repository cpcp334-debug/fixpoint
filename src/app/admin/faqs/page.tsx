import Link from "next/link";
import { prisma } from "@/server/db";
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
import type { ContentStatus, Prisma } from "@prisma/client";

const STATUSES: ContentStatus[] = ["draft", "review", "published", "archived"];

export default async function FaqsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; ok?: string; error?: string }>;
}) {
  const auth = await needPermission("diy");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const FAQ_ARTICLE_WHERE: Prisma.ArticleWhereInput = {
    OR: [{ slug: { startsWith: "faq-" } }, { categorySlugs: { contains: "service-faq" } }],
  };
  const where: Prisma.ArticleWhereInput = { ...FAQ_ARTICLE_WHERE };
  if (query.status && (STATUSES as string[]).includes(query.status)) {
    where.status = query.status as ContentStatus;
  }
  if (query.q?.trim()) {
    const q = query.q.trim();
    where.AND = [
      {
        OR: [
          { slug: { contains: q } },
          { translations: { some: { title: { contains: q } } } },
        ],
      },
    ];
  }
  const [totalFaqs, matchingCount, publicFaqs, rows] = await Promise.all([
    prisma.article.count({ where: FAQ_ARTICLE_WHERE }),
    prisma.article.count({ where }),
    prisma.article.count({
      where: { ...FAQ_ARTICLE_WHERE, status: "published", indexable: true },
    }),
    prisma.article.findMany({
      where,
      include: { translations: { where: { locale: "en" }, take: 1 } },
      orderBy: [{ updatedAt: "desc" }],
      take: 500,
    }),
  ]);
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.status) sp.set("status", query.status);
  const returnTo = `/admin/faqs${sp.toString() ? `?${sp}` : ""}`;

  return (
    <div>
      <PageHeader
        title="FAQs"
        note="Publish = published + indexable. Hide = draft + noindex. Soft-remove = archived. FAQ slugs use the faq- prefix; service-faq is kept in categories."
        actions={
          <Link
            href="/admin/faqs/new"
            className="inline-flex min-h-10 items-center rounded-md bg-navy px-4 text-sm font-medium text-white"
          >
            Create FAQ
          </Link>
        }
      />
      <AdminFlash ok={query.ok} error={query.error} />
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input
          name="q"
          defaultValue={query.q || ""}
          placeholder="Search slug or title"
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
        total={totalFaqs}
        noun="FAQ articles"
        steps="Run npx tsx scripts/publish-service-faqs-454.ts when FAQ batch is approved."
      />
      <AdminListSummary
        noun="FAQ articles"
        total={totalFaqs}
        matching={matchingCount}
        showing={rows.length}
        stats={[{ label: "public (published + indexable)", value: publicFaqs }]}
      />
      <AdminBulkTable
        entity="articles"
        returnTo={returnTo}
        headers={["Slug", "Title", "Status", "Indexable", "Updated", ""]}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [
            row.slug,
            row.translations[0]?.title || "—",
            row.status,
            row.indexable ? "yes" : "no",
            row.updatedAt.toISOString().slice(0, 10),
            <span key="actions" className="inline-flex flex-col gap-1">
              <Link className="text-navy" href={`/admin/faqs/${row.id}`}>
                Edit
              </Link>
              <AdminPreviewLinks enPath={`/faq/${row.slug}`} />
            </span>,
          ],
        }))}
        emptyNote="No FAQs match."
      />
      {matchingCount > rows.length ? (
        <p className="mt-3 text-sm text-muted">Table shows the first {rows.length} matches. Narrow with search or status.</p>
      ) : null}
    </div>
  );
}
