/**
 * Apply canonical EN (+ optional AR) service content for all approved-matrix Service rows.
 * Idempotent. Does not create hub Services. Does not publish.
 *
 * Env:
 *   CANONICAL_LIMIT — optional max services this run
 *   CANONICAL_INCLUDE_AR=1 — also write Arabic
 *   CANONICAL_FORCE=1 — refresh even if not Phase A1 stub
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { enqueueJob } from "../src/lib/content-generation/jobs";
import { processContentJob } from "../src/lib/content-generation/process-job";
import { loadDiyClassificationMatrix } from "../src/lib/service-location/diy-matrix";
import { DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS } from "../prisma/data/diy-safety-alignment-a411";
import { isPhaseA1Stub } from "../src/lib/content-generation/author-service-canonical";

async function main() {
  const limit = process.env.CANONICAL_LIMIT ? Number(process.env.CANONICAL_LIMIT) : null;
  const includeAr = process.env.CANONICAL_INCLUDE_AR === "1";
  const force = process.env.CANONICAL_FORCE === "1";
  const matrix = loadDiyClassificationMatrix();
  const hubs = new Set(DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS as readonly string[]);

  const services = await prisma.service.findMany({
    where: { status: { not: "archived" } },
    include: { translations: true },
    orderBy: { slug: "asc" },
  });

  const targets = services.filter((s) => matrix.bySlug.has(s.slug) && !hubs.has(s.slug));
  const batchKey = `canonical-${new Date().toISOString().slice(0, 10)}`;
  const report = {
    batchKey,
    targeted: 0,
    enSucceeded: 0,
    arSucceeded: 0,
    skipped: 0,
    failed: [] as Array<{ slug: string; error: string }>,
  };

  let processed = 0;
  for (const service of targets) {
    if (limit && processed >= limit) break;
    const en = service.translations.find((t) => t.locale === "en");
    if (!force && en && !isPhaseA1Stub(en.longDescription) && (en.faq || "[]") !== "[]") {
      report.skipped += 1;
      // still allow AR if requested
      if (!includeAr) continue;
    }

    processed += 1;
    report.targeted += 1;

    const enJob = await enqueueJob({
      kind: "service_canonical",
      idempotencyKey: `service_canonical:en:${service.slug}:v1`,
      batchKey,
      generationVersion: 1,
      serviceId: service.id,
      locale: "en",
      payloadJson: JSON.stringify({ force }),
      priority: 10,
      requeueSucceeded: force,
    });
    const enRes = await processContentJob(enJob.id);
    if (enRes.ok) report.enSucceeded += 1;
    else report.failed.push({ slug: service.slug, error: enRes.error || "en_failed" });

    if (includeAr) {
      const arJob = await enqueueJob({
        kind: "arabic_locale",
        idempotencyKey: `arabic_locale:service:${service.slug}:v1`,
        batchKey,
        generationVersion: 1,
        serviceId: service.id,
        locale: "ar",
        priority: 9,
        requeueSucceeded: force,
      });
      const arRes = await processContentJob(arJob.id);
      if (arRes.ok) report.arSucceeded += 1;
      else report.failed.push({ slug: `${service.slug}:ar`, error: arRes.error || "ar_failed" });
    }
  }

  const out = join(process.cwd(), "docs/content-canonical-apply.json");
  writeFileSync(out, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
