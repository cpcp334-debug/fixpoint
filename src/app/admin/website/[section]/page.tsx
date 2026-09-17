import Link from "next/link";
import { notFound } from "next/navigation";
import { needPermission } from "@/lib/admin/guard";
import { AdminFlash, Forbidden, PageHeader, PrimaryButton } from "@/components/admin/Ui";
import { saveSiteShellAction } from "@/app/admin/website/actions";
import {
  SITE_SHELL_SECTIONS,
  emptyShell,
  getSiteShellAdmin,
  type SiteShellSection,
} from "@/lib/site-shell";
import enMessages from "@/../messages/en.json";
import arMessages from "@/../messages/ar.json";

function defaultsFor(section: SiteShellSection) {
  if (section === "header") {
    return {
      en: {
        brandLabel: "Al Najah Al Daem · Fixpoint",
        quoteLabel: enMessages.Nav.quote,
        aiLabel: enMessages.Nav.ai,
        showAi: true,
        showQuote: true,
        nav: {
          services: enMessages.Nav.services,
          diy: enMessages.Nav.diy,
          blog: enMessages.Nav.blog,
          faq: enMessages.Nav.faq,
          locations: enMessages.Nav.locations,
          reviews: enMessages.Nav.reviews,
          contact: enMessages.Nav.contact,
        },
      },
      ar: {
        brandLabel: "النجاح الدائم · Fixpoint",
        quoteLabel: arMessages.Nav.quote,
        aiLabel: arMessages.Nav.ai,
        showAi: true,
        showQuote: true,
        nav: {
          services: arMessages.Nav.services,
          diy: arMessages.Nav.diy,
          blog: arMessages.Nav.blog,
          faq: arMessages.Nav.faq,
          locations: arMessages.Nav.locations,
          reviews: arMessages.Nav.reviews,
          contact: arMessages.Nav.contact,
        },
      },
    };
  }
  if (section === "footer") {
    return {
      en: {
        companyHeading: enMessages.Footer.company,
        contactHeading: enMessages.Footer.contact,
        followHeading: enMessages.Footer.follow,
        legalHeading: enMessages.Footer.legal,
        rights: enMessages.Footer.rights,
        companyBlurb: "Cleaning & building maintenance across the UAE.",
      },
      ar: {
        companyHeading: arMessages.Footer.company,
        contactHeading: arMessages.Footer.contact,
        followHeading: arMessages.Footer.follow,
        legalHeading: arMessages.Footer.legal,
        rights: arMessages.Footer.rights,
        companyBlurb: "تنظيف وصيانة المباني في الإمارات.",
      },
    };
  }
  return {
    en: {
      heroKicker: enMessages.Home.heroKicker,
      heroTitle: enMessages.Home.heroTitle,
      heroLead: enMessages.Home.heroLead,
      ctaQuote: enMessages.Home.ctaQuote,
      ctaAi: enMessages.Home.ctaAi,
      stripCleaning: enMessages.Home.stripCleaning,
      stripMaintenance: enMessages.Home.stripMaintenance,
      stripDiy: enMessages.Home.stripDiy,
      stripCoverage: enMessages.Home.stripCoverage,
      unsureTitle: enMessages.Home.unsureTitle,
      unsureLead: enMessages.Home.unsureLead,
      helpTitle: enMessages.Home.helpTitle,
      helpLead: enMessages.Home.helpLead,
    },
    ar: {
      heroKicker: arMessages.Home.heroKicker,
      heroTitle: arMessages.Home.heroTitle,
      heroLead: arMessages.Home.heroLead,
      ctaQuote: arMessages.Home.ctaQuote,
      ctaAi: arMessages.Home.ctaAi,
      stripCleaning: arMessages.Home.stripCleaning,
      stripMaintenance: arMessages.Home.stripMaintenance,
      stripDiy: arMessages.Home.stripDiy,
      stripCoverage: arMessages.Home.stripCoverage,
      unsureTitle: arMessages.Home.unsureTitle,
      unsureLead: arMessages.Home.unsureLead,
      helpTitle: arMessages.Home.helpTitle,
      helpLead: arMessages.Home.helpLead,
    },
  };
}

export default async function WebsiteSectionEditor({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const auth = await needPermission("diy");
  if (!auth.ok) return <Forbidden />;
  const { section: raw } = await params;
  if (!(SITE_SHELL_SECTIONS as readonly string[]).includes(raw)) notFound();
  const section = raw as SiteShellSection;
  const query = await searchParams;
  const doc = await getSiteShellAdmin(section);
  const defaults = defaultsFor(section);
  const payloadEn = doc?.payloadEn && doc.payloadEn !== "{}" ? doc.payloadEn : JSON.stringify(defaults.en, null, 2);
  const payloadAr = doc?.payloadAr && doc.payloadAr !== "{}" ? doc.payloadAr : JSON.stringify(defaults.ar, null, 2);

  return (
    <div>
      <PageHeader
        title={`Website · ${section}`}
        note={`Status: ${doc?.status || "new"}. Edit JSON carefully. Empty/missing keys fall back to message defaults. Schema hint: ${JSON.stringify(emptyShell(section))}`}
        actions={
          <div className="flex flex-wrap gap-3 text-sm">
            <Link className="text-navy" href="/admin/website">
              ← All sections
            </Link>
            <Link className="text-navy" href="/en" target="_blank" rel="noopener noreferrer">
              Preview home EN
            </Link>
            <Link className="text-navy" href="/ar" target="_blank" rel="noopener noreferrer">
              Preview home AR
            </Link>
          </div>
        }
      />
      <AdminFlash ok={query.ok} error={query.error} />
      <form action={saveSiteShellAction} className="space-y-4">
        <input type="hidden" name="section" value={section} />
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">English payload (JSON)</span>
            <textarea
              name="payloadEn"
              defaultValue={payloadEn}
              rows={22}
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 font-mono text-xs"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Arabic payload (JSON)</span>
            <textarea
              name="payloadAr"
              defaultValue={payloadAr}
              rows={22}
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 font-mono text-xs"
              required
              dir="rtl"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            name="intent"
            value="save"
            className="rounded-md border border-line bg-white px-4 py-2 text-sm text-navy"
          >
            Save draft
          </button>
          <button type="submit" name="intent" value="publish" className="rounded-md bg-navy px-4 py-2 text-sm text-white">
            Publish
          </button>
        </div>
      </form>
      <p className="mt-4 text-sm text-muted">
        Publish makes this section live on the public site. Draft stays admin-only until Publish.
      </p>
    </div>
  );
}
