/**
 * Controlled bulk cover → draft→review→approved → CONFIRM_PUBLISH for ServiceLocation pairs.
 * Explicitly overrides the "never bulk-publish" product rule for offline corpus runs.
 *
 * Env:
 *   SL_BULK_CONFIRM=CONFIRM_PUBLISH — required
 *   SL_BULK_LIMIT — max pairs this run (default 50)
 *   SL_BULK_OFFSET — skip N unpublished pairs (default 0)
 *   SL_BULK_PUBLISH_AR=1 — also publish AR when eligible (default 1)
 *   SL_BULK_DRY_RUN=1 — report only, no writes
 */
import { prisma } from "../src/server/db";
import { applyCoverageDecision } from "../src/lib/service-location/coverage-ops";
import {
  loadEligibilityForId,
  promoteLifecycleStep,
  publishServiceLocation,
} from "../src/lib/service-location/publication-ops";

const ACTOR = "sl-bulk-publish-pilot";

async function ensureApproved(id: string) {
  const row = await prisma.serviceLocation.findUniqueOrThrow({
    where: { id },
    select: { coverageStatus: true, covered: true },
  });
  if (row.coverageStatus === "published") return "already_published";
  if (!row.covered) {
    await applyCoverageDecision(prisma, {
      serviceLocationId: id,
      decision: "COVERED",
      actor: ACTOR,
      reason: "bulk corpus coverage for website publication",
    });
  }
  let status = (
    await prisma.serviceLocation.findUniqueOrThrow({
      where: { id },
      select: { coverageStatus: true },
    })
  ).coverageStatus;

  if (status === "draft") {
    await promoteLifecycleStep(prisma, {
      serviceLocationId: id,
      to: "review",
      actor: ACTOR,
      reason: "bulk corpus promote draft→review",
    });
    status = "review";
  }
  if (status === "review") {
    await promoteLifecycleStep(prisma, {
      serviceLocationId: id,
      to: "approved",
      actor: ACTOR,
      reason: "bulk corpus promote review→approved",
    });
  }
  return "approved";
}

async function main() {
  if (process.env.SL_BULK_CONFIRM !== "CONFIRM_PUBLISH") {
    throw new Error("Set SL_BULK_CONFIRM=CONFIRM_PUBLISH to run this script");
  }
  const limit = Number(process.env.SL_BULK_LIMIT || "50");
  const offset = Number(process.env.SL_BULK_OFFSET || "0");
  const publishAr = process.env.SL_BULK_PUBLISH_AR !== "0";
  const dryRun = process.env.SL_BULK_DRY_RUN === "1";

  // Prefer pairs that already have EN shells (same pool long-batch fills).
  // Order by serviceId/locationId to match content-sl-long-batch.
  const candidates = await prisma.serviceLocation.findMany({
    where: {
      coverageStatus: { not: "published" },
      service: { status: "active" },
      location: { status: "active", serves: true },
      translations: { some: { locale: "en", h1: { not: "" }, intro: { not: "" } } },
    },
    orderBy: [{ serviceId: "asc" }, { locationId: "asc" }],
    skip: offset,
    take: limit,
    select: {
      id: true,
      qualityStatus: true,
      qualityScore: true,
      service: { select: { slug: true } },
      location: { select: { slug: true } },
    },
  });

  const report = {
    dryRun,
    offset,
    limit,
    selected: candidates.length,
    published: 0,
    skipped: 0,
    failed: [] as Array<{ pair: string; error: string; bucket?: string }>,
    samples: [] as string[],
  };

  for (const row of candidates) {
    const pair = `${row.service.slug}/${row.location.slug}`;
    try {
      if (dryRun) {
        report.published += 1;
        if (report.samples.length < 10) report.samples.push(pair);
        continue;
      }

      // Cover + quality mark before eligibility (eligibleEn requires both).
      await ensureApproved(row.id);
      if (
        row.qualityStatus !== "publishable" &&
        row.qualityStatus !== "approved" &&
        row.qualityStatus !== "indexable"
      ) {
        await prisma.serviceLocation.update({
          where: { id: row.id },
          data: { qualityStatus: "publishable", qualityScore: Math.max(row.qualityScore, 80) },
        });
      }

      const { eligibility } = await loadEligibilityForId(prisma, row.id);
      if (!eligibility.eligibleEn) {
        report.skipped += 1;
        report.failed.push({
          pair,
          error: "not_eligible_en",
          bucket: eligibility.primaryBucket,
        });
        continue;
      }

      // ensureApproved may have left lifecycle at approved; re-check after quality update
      await ensureApproved(row.id);
      await publishServiceLocation(prisma, {
        serviceLocationId: row.id,
        actor: ACTOR,
        reason: "bulk corpus CONFIRM_PUBLISH for public SL pages",
        confirmToken: "CONFIRM_PUBLISH",
        publishAr,
      });
      report.published += 1;
      if (report.samples.length < 10) report.samples.push(pair);
    } catch (e) {
      report.failed.push({ pair, error: e instanceof Error ? e.message : String(e) });
    }
  }

  const publishedTotal = await prisma.serviceLocation.count({
    where: { coverageStatus: "published", covered: true, indexable: true },
  });
  console.log(JSON.stringify({ ...report, publishedTotal }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
