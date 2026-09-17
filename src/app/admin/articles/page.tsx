import Link from "next/link";
import { needPermission } from "@/lib/admin/guard";
import { Forbidden, PageHeader } from "@/components/admin/Ui";

export default async function ArticlesHubPage() {
  const auth = await needPermission("diy");
  if (!auth.ok) return <Forbidden />;
  return (
    <div>
      <PageHeader
        title="Articles"
        note="Blogs and FAQs are managed in separate sections. Use the cards below or the sidebar links."
      />
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <Link
          href="/admin/blogs"
          className="rounded-md border border-line bg-white p-5 transition hover:border-navy"
        >
          <p className="text-lg font-semibold text-navy">Blogs</p>
          <p className="mt-2 text-sm text-muted">
            Guides, place blogs, and editorial posts (non faq-* slugs). Public at /blog/…
          </p>
        </Link>
        <Link href="/admin/faqs" className="rounded-md border border-line bg-white p-5 transition hover:border-navy">
          <p className="text-lg font-semibold text-navy">FAQs</p>
          <p className="mt-2 text-sm text-muted">
            Service FAQ pages (faq-* slugs, service-faq category). Public at /faq/…
          </p>
        </Link>
      </div>
    </div>
  );
}
