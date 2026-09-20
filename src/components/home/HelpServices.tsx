import { ServiceCard } from "@/components/home/Cards";
import { ButtonLink } from "@/components/ui/Button";

const INITIAL_VISIBLE = 4;

type Item = {
  slug: string;
  name: string;
  description: string;
  benefit?: string;
  diyLabel?: string;
  amcLabel?: string;
  emergencyLabel?: string;
};

/**
 * Server-rendered service strip. Only the first N items are in HTML;
 * "see more" goes to /services (avoids hydrating the full catalog as client props).
 */
export function HelpServices({
  items,
  cta,
  moreLabel,
  lessLabel,
}: {
  items: Item[];
  cta: string;
  moreLabel: string;
  lessLabel: string;
}) {
  void lessLabel;
  const visible = items.slice(0, INITIAL_VISIBLE);
  const hidden = Math.max(0, items.length - INITIAL_VISIBLE);

  return (
    <>
      <ul className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {visible.map((service) => (
          <li key={service.slug}>
            <ServiceCard
              slug={service.slug}
              name={service.name}
              description={service.description}
              benefit={service.benefit}
              cta={cta}
              diyLabel={service.diyLabel}
              amcLabel={service.amcLabel}
              emergencyLabel={service.emergencyLabel}
              compact
            />
          </li>
        ))}
      </ul>
      {hidden ? (
        <div className="mt-3">
          <ButtonLink href="/services" variant="secondary">
            {moreLabel}
          </ButtonLink>
        </div>
      ) : null}
    </>
  );
}
