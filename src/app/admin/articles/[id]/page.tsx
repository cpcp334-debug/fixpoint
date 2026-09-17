import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { Forbidden } from "@/components/admin/Ui";
import { adminArticleBasePath } from "@/lib/admin/articles";

export default async function ArticleIdRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await needPermission("diy");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const row = await prisma.article.findUnique({ where: { id }, select: { slug: true } });
  if (!row) notFound();
  redirect(`${adminArticleBasePath(row.slug)}/${id}`);
}
