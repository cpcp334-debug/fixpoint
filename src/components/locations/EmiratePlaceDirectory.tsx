import { Link } from "@/i18n/routing";
import { publishedEmirateDirectory } from "@/lib/locations/public-filter";

function PlaceList({ title, places }: { title: string; places: Array<{ slug: string; name: string }> }) {
  if (!places.length) return null;
  return (
    <div>
      <h3 className="text-base font-semibold text-navy">
        {title} <span className="font-normal text-muted">({places.length})</span>
      </h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {places.map((place) => (
          <li key={place.slug}>
            <Link
              href={`/locations/${place.slug}`}
              className="inline-flex rounded-full border border-line bg-white px-3 py-1.5 text-sm text-navy hover:border-accent"
            >
              {place.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function EmiratePlaceDirectory({
  emirateSlug,
  locale,
  title,
  lead,
  citiesLabel,
  areasLabel,
  note,
}: {
  emirateSlug: string;
  locale: string;
  title: string;
  lead: string;
  citiesLabel: string;
  areasLabel: string;
  note: string;
}) {
  const directory = await publishedEmirateDirectory(emirateSlug, locale);
  if (!directory.total) return null;

  return (
    <section className="rounded-xl border border-line bg-sand/40 p-5">
      <h2 className="text-xl font-semibold text-navy">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{lead}</p>
      <div className="mt-5 grid gap-6">
        <PlaceList title={citiesLabel} places={directory.cities} />
        <PlaceList title={areasLabel} places={directory.areas} />
      </div>
      <p className="mt-5 max-w-3xl text-sm leading-6 text-muted">{note}</p>
    </section>
  );
}
