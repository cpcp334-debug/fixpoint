import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { Forbidden, PageHeader } from "@/components/admin/Ui";
import { ArticleAdminForm } from "@/components/admin/ArticleAdminForm";
import { isFaqArticleSlug } from "@/lib/admin/articles";

export default async function FaqEditPage({
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
  if (!isFaqArticleSlug(row.slug)) redirect(`/admin/blogs/${id}`);
  const en = row.translations.find((t) => t.locale === "en");
  const ar = row.translations.find((t) => t.locale === "ar");
  return (
    <div>
      <PageHeader
        title={en?.title || row.slug}
        note={`FAQ · slug ${row.slug} (fixed). Hazardous FAQs stay observation/stop only — no prices.`}
      />
      <ArticleAdminForm
        kind="faq"
        listHref="/admin/faqs"
        row={row}
        en={en}
        ar={ar}
        ok={query.ok}
        error={query.error}
      />
    </div>
  );
}
