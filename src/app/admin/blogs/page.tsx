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

const BLOG_ARTICLE_WHERE: Prisma.ArticleWhereInput = {
  NOT: [{ slug: { startsWith: "faq-" } }],
};

export default async function BlogsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; ok?: string; error?: string }>;
}) {
  const auth = await needPermission("diy");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.ArticleWhereInput = { ...BLOG_ARTICLE_WHERE };
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
  const [totalBlogs, matchingCount, publicBlogs, rows] = await Promise.all([
    prisma.article.count({ where: BLOG_ARTICLE_WHERE }),
    prisma.article.count({ where }),
    prisma.article.count({
      where: { ...BLOG_ARTICLE_WHERE, status: "published", indexable: true },
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
  const returnTo = `/admin/blogs${sp.toString() ? `?${sp}` : ""}`;

  return (
    <div>
      <PageHeader
        title="Blogs"
        note="Publish = published + indexable. Hide = draft + noindex. Soft-remove = archived. Blog slugs must not use the faq- prefix."
        actions={
          <Link
            href="/admin/blogs/new"
            className="inline-flex min-h-10 items-center rounded-md bg-navy px-4 text-sm font-medium text-white"
          >
            Create blog
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
        total={totalBlogs}
        noun="blogs"
        steps="Run npx tsx scripts/publish-service-blogs-454.ts or scripts/seed-blog-45-editorial.ts after catalog seed."
      />
      <AdminListSummary
        noun="blogs"
        total={totalBlogs}
        matching={matchingCount}
        showing={rows.length}
        stats={[{ label: "public (published + indexable)", value: publicBlogs }]}
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
              <Link className="text-navy" href={`/admin/blogs/${row.id}`}>
                Edit
              </Link>
              <AdminPreviewLinks enPath={`/blog/${row.slug}`} />
            </span>,
          ],
        }))}
        emptyNote="No blogs match."
      />
      {matchingCount > rows.length ? (
        <p className="mt-3 text-sm text-muted">Table shows the first {rows.length} matches. Narrow with search or status.</p>
      ) : null}
    </div>
  );
}
