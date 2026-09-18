/**
 * Phase 1 — backfill ServiceI18n AR display names (REVIEW_REQUIRED → MSA via buildVisitorServiceCopy).
 * Idempotent. Does not change slugs, status, or EN copy unless --full-ar-shell.
 *
 * Usage:
 *   npx tsx scripts/phase1-backfill-service-ar-names.ts --dry-run --limit=10
 *   npx tsx scripts/phase1-backfill-service-ar-names.ts --limit=50
 *   npx tsx scripts/phase1-backfill-service-ar-names.ts
 */
import "./load-env-mysql";
import { prisma } from "../src/server/db";
import { APPROVED_CATEGORIES } from "../prisma/data/catalog-a1";
import { buildVisitorServiceCopy } from "../src/lib/catalog/service-visitor-copy";

const AR = /[\u0600-\u06FF]/;
const CATEGORY_AR: Record<string, string> = Object.fromEntries(
  APPROVED_CATEGORIES.map((cat) => [cat.slug, cat.nameAr]),
);

function needsArName(name: string | null | undefined) {
  if (!name) return true;
  if (name === "REVIEW_REQUIRED" || name.startsWith("REVIEW_REQUIRED")) return true;
  return !AR.test(name);
}

function parseArgs(argv: string[]) {
  let dryRun = false;
  let limit = 0;
  let fullArShell = false;
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a === "--full-ar-shell") fullArShell = true;
    else if (a.startsWith("--limit=")) limit = Math.max(0, Number(a.slice(8)) || 0);
  }
  return { dryRun, limit, fullArShell };
}

async function main() {
  const { dryRun, limit, fullArShell } = parseArgs(process.argv.slice(2));
  const rows = await prisma.service.findMany({
    include: {
      translations: true,
      category: { include: { translations: true } },
    },
    orderBy: { slug: "asc" },
  });

  let candidates = rows.filter((row) => {
    const ar = row.translations.find((t) => t.locale === "ar");
    if (needsArName(ar?.name)) return true;
    // Also backfill body fields still stuck on REVIEW_REQUIRED after name-only Phase 1.
    if (!ar) return false;
    return (
      ar.shortDescription === "REVIEW_REQUIRED" ||
      ar.longDescription === "REVIEW_REQUIRED" ||
      (ar.shortDescription || "").includes("REVIEW_REQUIRED") ||
      (ar.longDescription || "").includes("REVIEW_REQUIRED")
    );
  });
  if (limit > 0) candidates = candidates.slice(0, limit);

  const samples: Array<{ slug: string; from: string; to: string }> = [];
  let updated = 0;
  let skipped = 0;

  for (const row of candidates) {
    const en = row.translations.find((t) => t.locale === "en");
    const ar = row.translations.find((t) => t.locale === "ar");
    if (!en || !ar) {
      skipped += 1;
      continue;
    }
    const categorySlug = row.category?.slug || "general-maintenance";
    const category = APPROVED_CATEGORIES.find((cat) => cat.slug === categorySlug);
    const catArFromDb = row.category?.translations.find((t) => t.locale === "ar")?.name;
    const categoryNameAr =
      (catArFromDb && AR.test(catArFromDb) && catArFromDb !== "REVIEW_REQUIRED"
        ? catArFromDb
        : CATEGORY_AR[categorySlug]) || "الصيانة";

    const copy = buildVisitorServiceCopy({
      slug: row.slug,
      nameEn: en.name || row.slug,
      categorySlug,
      categoryNameEn: category?.nameEn || "Maintenance",
      categoryNameAr,
    });

    if (!AR.test(copy.nameAr) || copy.nameAr === "REVIEW_REQUIRED") {
      skipped += 1;
      continue;
    }

    samples.push({ slug: row.slug, from: ar.name, to: copy.nameAr });
    if (dryRun) {
      updated += 1;
      continue;
    }

    const data: Record<string, string> = {};
    if (needsArName(ar.name)) {
      data.name = copy.nameAr;
      data.seoTitle = `${copy.nameAr} | النجاح الدائم · فكس بوينت`.slice(0, 60);
    } else if (!AR.test(ar.seoTitle || "") || (ar.seoTitle || "").includes("Fixpoint") || (ar.seoTitle || "").includes("REVIEW_REQUIRED")) {
      data.seoTitle = `${ar.name} | النجاح الدائم · فكس بوينت`.slice(0, 60);
    }
    // Always fill AR body fields when still REVIEW_REQUIRED (or when --full-ar-shell).
    const needShort = fullArShell || ar.shortDescription === "REVIEW_REQUIRED" || (ar.shortDescription || "").includes("REVIEW_REQUIRED");
    const needLong = fullArShell || ar.longDescription === "REVIEW_REQUIRED" || (ar.longDescription || "").includes("REVIEW_REQUIRED");
    if (needShort) data.shortDescription = copy.shortAr;
    if (needLong) data.longDescription = copy.longAr;
    if (fullArShell || ar.whoItIsFor === "REVIEW_REQUIRED") data.whoItIsFor = copy.whoAr;
    if (fullArShell || ar.whatWeDo === "REVIEW_REQUIRED") data.whatWeDo = copy.whatAr;
    if (fullArShell || ar.whenProfessional === "REVIEW_REQUIRED") data.whenProfessional = copy.whenAr;
    if (fullArShell || ar.process === "REVIEW_REQUIRED") data.process = copy.processAr;
    if (fullArShell || ar.pricingInfo === "REVIEW_REQUIRED") data.pricingInfo = copy.priceAr;
    if (fullArShell || ar.professionalFallback === "REVIEW_REQUIRED") data.professionalFallback = copy.safetyAr;
    if (fullArShell || ar.safetyNotes === "REVIEW_REQUIRED") data.safetyNotes = copy.safetyAr;
    if (fullArShell || !AR.test(ar.metaDescription || "") || (ar.metaDescription || "").includes("REVIEW_REQUIRED")) {
      data.metaDescription = copy.shortAr.slice(0, 155);
    }

    if (Object.keys(data).length === 0) {
      skipped += 1;
      continue;
    }

    await prisma.serviceI18n.update({
      where: { serviceId_locale: { serviceId: row.id, locale: "ar" } },
      data,
    });
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        limit: limit || null,
        fullArShell,
        candidates: candidates.length,
        updated,
        skipped,
        samples: samples.slice(0, 15),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
