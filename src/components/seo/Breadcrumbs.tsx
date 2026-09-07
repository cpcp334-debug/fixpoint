import { Link } from "@/i18n/routing";

export function Breadcrumbs({
  items,
  label,
}: {
  items: Array<{ href: string; label: string }>;
  label?: string;
}) {
  return (
    <nav aria-label={label || "Breadcrumb"} className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center gap-2">
            {index > 0 ? (
              <span aria-hidden="true" className="text-gold">
                ·
              </span>
            ) : null}
            {index === items.length - 1 ? (
              <span className="text-ink">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-accent">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
