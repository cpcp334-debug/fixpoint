import { Link } from "@/i18n/routing";
import { TOP_ELECTRICAL_SLUGS } from "../../../prisma/data/electrical-service-copy";
import { getApprovedCatalogServiceBySlug } from "@/lib/catalog";
import { serviceHref } from "@/lib/slug/locale-slug";

export async function TopElectricalServices({
  locale,
  title,
  lead,
  cta,
}: {
  locale: string;
  title: string;
  lead: string;
  cta: string;
}) {
  const items = (
    await Promise.all(
      TOP_ELECTRICAL_SLUGS.map(async (slug) => {
        const service = await getApprovedCatalogServiceBySlug(slug, locale);
        if (!service) return null;
        return {
          slug: service.slug,
          href: serviceHref(locale, service.slug),
          name: service.t.name,
          description: service.t.shortDescription,
        };
      }),
    )
  ).filter(Boolean) as Array<{ slug: string; href: string; name: string; description: string }>;

  if (!items.length) return null;

  return (
    <section>
      <h2 className="text-xl font-semibold text-navy">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{lead}</p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={item.href}
              className="pass block h-full rounded-xl border border-line bg-white p-4 hover:border-accent"
            >
              <span className="font-medium text-navy">{item.name}</span>
              <span className="mt-1 block text-sm leading-6 text-muted">{item.description}</span>
              <span className="mt-3 inline-block text-sm font-medium text-accent">{cta}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
