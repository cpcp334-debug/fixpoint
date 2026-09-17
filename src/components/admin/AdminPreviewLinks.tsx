import Link from "next/link";

/** Public EN/AR preview links for admin content rows and edit pages. */
export function AdminPreviewLinks({
  enPath,
  arPath,
  className = "",
}: {
  /** Path without locale, e.g. `/blog/guide-plumbing` or `/services/electrical/ac-maintenance` */
  enPath: string;
  arPath?: string;
  className?: string;
}) {
  const en = enPath.startsWith("/") ? enPath : `/${enPath}`;
  const ar = arPath ? (arPath.startsWith("/") ? arPath : `/${arPath}`) : en;
  return (
    <span className={`inline-flex flex-wrap gap-2 text-xs ${className}`}>
      <Link
        href={`/en${en}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-navy underline-offset-2 hover:underline"
      >
        Preview EN
      </Link>
      <Link
        href={`/ar${ar}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-navy underline-offset-2 hover:underline"
      >
        Preview AR
      </Link>
    </span>
  );
}
