import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import {
  AdminFlash,
  AdminHardDeleteButton,
  AdminPreviewLinks,
  Forbidden,
  PageHeader,
} from "@/components/admin/Ui";
import { ArticleAdminForm } from "@/components/admin/ArticleAdminForm";
import { isFaqArticleSlug } from "@/lib/admin/articles";

export default async function BlogEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const auth = await needPermission("diy");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const query = await searchParams;
  const row = await prisma.article.findUnique({ where: { id }, include: { translations: true } });
  if (!row) notFound();
  if (isFaqArticleSlug(row.slug)) redirect(`/admin/faqs/${id}`);
  const en = row.translations.find((t) => t.locale === "en");
  const ar = row.translations.find((t) => t.locale === "ar");
  const isSuper = auth.session.role === "super_admin" || auth.session.role === "admin";
  return (
    <div>
      <PageHeader
        title={en?.title || row.slug}
        note={`Blog · slug ${row.slug} (fixed). Soft-archive via status=archived. Permanent delete = super admin only.`}
        actions={<AdminPreviewLinks enPath={`/blog/${row.slug}`} />}
      />
      <ArticleAdminForm
        kind="blog"
        listHref="/admin/blogs"
        row={row}
        en={en}
        ar={ar}
        ok={query.ok}
        error={query.error}
      />
      {isSuper ? (
        <div className="mt-6 max-w-3xl rounded-md border border-danger/30 bg-white p-4">
          <p className="text-sm font-medium text-danger">Super admin · permanent delete</p>
          <div className="mt-3">
            <AdminHardDeleteButton entity="articles" id={row.id} returnTo="/admin/blogs" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
