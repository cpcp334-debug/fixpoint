import { siteConfig } from "@/config/site";

export function LicenseCards({
  locale,
  activityLabel,
  licenseLabel,
}: {
  locale: string;
  activityLabel: string;
  licenseLabel: string;
}) {
  const ar = locale === "ar";
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {siteConfig.licenses.map((lic) => (
        <li key={lic.licenseNo} className="rounded-[16px] border border-line/80 bg-white p-5">
          <h3 className="font-semibold text-navy">{lic.legalName}</h3>
          <p className="mt-1 text-sm text-muted">{ar ? lic.emirateAr : lic.emirate}</p>
          <p className="mt-3 text-sm text-muted">
            {activityLabel}: {lic.activity}
          </p>
          <p className="text-sm text-muted">
            {licenseLabel}: {lic.licenseNo}
          </p>
        </li>
      ))}
    </ul>
  );
}
