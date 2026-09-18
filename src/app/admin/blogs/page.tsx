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

const PER_PAGE_OPTIONS = [50, 100] as const;
type PerPage = (typeof PER_PAGE_OPTIONS)[number];

function parsePerPage(raw?: string): PerPage {
  return raw === "100" ? 100 : 50;
}

function parsePage(raw: string | undefined, totalPages: number): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, Math.max(1, totalPages));
}

function blogsListHref(opts: {
  q?: string;
  status?: string;
  page?: number;
  perPage: PerPage;
}): string {
  const sp = new URLSearchParams();
  if (opts.q?.trim()) sp.set("q", opts.q.trim());
  if (opts.status) sp.set("status", opts.status);
  if (opts.perPage !== 50) sp.set("perPage", String(opts.perPage));
  if (opts.page && opts.page > 1) sp.set("page", String(opts.page));
  const qs = sp.toString();
  return `/admin/blogs${qs ? `?${qs}` : ""}`;
}

export default async function BlogsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    ok?: string;
    error?: string;
    page?: string;
    perPage?: string;
  }>;
}) {
  const auth = await needPermission("diy");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const perPage = parsePerPage(query.perPage);
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

  const [totalBlogs, matchingCount, publicBlogs] = await Promise.all([
    prisma.article.count({ where: BLOG_ARTICLE_WHERE }),
    prisma.article.count({ where }),
    prisma.article.count({
      where: { ...BLOG_ARTICLE_WHERE, status: "published", indexable: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(matchingCount / perPage));
  const page = parsePage(query.page, totalPages);
  const skip = (page - 1) * perPage;

  const rows = await prisma.article.findMany({
    where,
    include: { translations: { where: { locale: "en" }, take: 1 } },
    orderBy: [{ updatedAt: "desc" }],
    skip,
    take: perPage,
  });

  const filterBase = { q: query.q, status: query.status, perPage };
  const returnTo = blogsListHref({ ...filterBase, page });
  const rangeFrom = matchingCount === 0 ? 0 : skip + 1;
  const rangeTo = matchingCount === 0 ? 0 : skip + rows.length;

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
        <select name="perPage" defaultValue={String(perPage)} className="rounded-md border border-line px-3 py-2">
          {PER_PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} per page
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
        rangeFrom={rangeFrom || undefined}
        rangeTo={rangeTo || undefined}
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
      {matchingCount > 0 ? (
        <nav className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted" aria-label="Blogs pagination">
          <span>
            Page <span className="font-semibold text-navy">{page}</span> of{" "}
            <span className="font-semibold text-navy">{totalPages.toLocaleString()}</span>
          </span>
          {page > 1 ? (
            <Link className="text-navy" href={blogsListHref({ ...filterBase, page: page - 1 })}>
              Previous
            </Link>
          ) : (
            <span className="opacity-40">Previous</span>
          )}
          {page < totalPages ? (
            <Link className="text-navy" href={blogsListHref({ ...filterBase, page: page + 1 })}>
              Next
            </Link>
          ) : (
            <span className="opacity-40">Next</span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
