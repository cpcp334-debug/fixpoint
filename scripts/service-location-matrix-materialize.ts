/**
 * Idempotent ServiceLocation candidate matrix materialize.
 * Creates draft/uncovered/non-indexable pairs for Service × Location.
 * Does NOT invent hub Service rows. Does NOT publish. Does NOT modify existing published/pilot flags.
 *
 * Env:
 *   MATRIX_LIMIT — optional max number of NEW pairs to create this run (chunked smoke).
 *   MATRIX_INCLUDE_LEGACY=1 — include UNMAPPED_LEGACY_DRAFT_SLUGS (default excludes them).
 *
 * Note: With 7 category-only hubs, approved Service×Location max is 304×200=60,800
 * (not 311×200). Including legacy (13) yields 317×200=63,400 if MATRIX_INCLUDE_LEGACY=1.
 */
import { A32_EMPTY_I18N } from "../prisma/data/service-location-a32-pilot";
import { UNMAPPED_LEGACY_DRAFT_SLUGS } from "../prisma/data/catalog-a1";
import { prisma } from "../src/server/db";

const BATCH_SIZE = 50;
const PROGRESS_EVERY = 500;

type Candidate = { serviceId: string; locationId: string };

async function counts() {
  const [total, published, draftUncovered, services, locations] = await Promise.all([
    prisma.serviceLocation.count(),
    prisma.serviceLocation.count({
      where: { coverageStatus: "published", covered: true, indexable: true },
    }),
    prisma.serviceLocation.count({
      where: { coverageStatus: "draft", covered: false },
    }),
    prisma.service.count({ where: { status: { not: "archived" } } }),
    prisma.location.count(),
  ]);
  return { total, published, draftUncovered, services, locations };
}

async function ensureI18nShells(serviceLocationId: string) {
  const existing = await prisma.serviceLocationI18n.findMany({
    where: { serviceLocationId },
    select: { locale: true },
  });
  const have = new Set(existing.map((r) => r.locale));
  const missing = (["en", "ar"] as const).filter((locale) => !have.has(locale));
  if (!missing.length) return 0;
  await prisma.serviceLocationI18n.createMany({
    data: missing.map((locale) => ({
      serviceLocationId,
      locale,
      ...A32_EMPTY_I18N,
    })),
  });
  return missing.length;
}

async function main() {
  const limitRaw = process.env.MATRIX_LIMIT?.trim();
  const limit = limitRaw ? Number(limitRaw) : null;
  if (limitRaw && (!Number.isFinite(limit) || (limit as number) < 1)) {
    throw new Error(`Invalid MATRIX_LIMIT: ${limitRaw}`);
  }

  const before = await counts();
  console.log(JSON.stringify({ phase: "before", ...before, matrixLimit: limit }, null, 2));

  const includeLegacy = process.env.MATRIX_INCLUDE_LEGACY === "1";
  const services = await prisma.service.findMany({
    where: {
      status: { not: "archived" },
      ...(includeLegacy ? {} : { slug: { notIn: [...UNMAPPED_LEGACY_DRAFT_SLUGS] } }),
    },
    select: { id: true, slug: true },
    orderBy: { slug: "asc" },
  });
  const locations = await prisma.location.findMany({
    select: { id: true, slug: true },
    orderBy: { slug: "asc" },
  });

  const existing = await prisma.serviceLocation.findMany({
    select: { serviceId: true, locationId: true },
  });
  const existingKeys = new Set(existing.map((r) => `${r.serviceId}:${r.locationId}`));

  const missing: Candidate[] = [];
  for (const service of services) {
    for (const location of locations) {
      const key = `${service.id}:${location.id}`;
      if (existingKeys.has(key)) continue;
      missing.push({ serviceId: service.id, locationId: location.id });
      if (limit && missing.length >= limit) break;
    }
    if (limit && missing.length >= limit) break;
  }

  console.log(
    JSON.stringify(
      {
        phase: "plan",
        services: services.length,
        locations: locations.length,
        existingPairs: existingKeys.size,
        candidatesMissing: missing.length,
        theoreticalMatrix: services.length * locations.length,
      },
      null,
      2,
    ),
  );

  let created = 0;
  let i18nCreated = 0;

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const chunk = missing.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      chunk.map((pair) =>
        prisma.serviceLocation.create({
          data: {
            serviceId: pair.serviceId,
            locationId: pair.locationId,
            coverageStatus: "draft",
            covered: false,
            indexable: false,
            indexableEn: false,
            indexableAr: false,
            qualityStatus: "incomplete",
            qualityScore: 0,
            bookingEnabledOverride: null,
            amcAvailableOverride: null,
            emergencyAvailableOverride: null,
            diyRestricted: false,
            heroImageOverride: null,
            publishedAt: null,
            approvedAt: null,
            approvedBy: null,
            translations: {
              create: [
                { locale: "en", ...A32_EMPTY_I18N },
                { locale: "ar", ...A32_EMPTY_I18N },
              ],
            },
          },
        }),
      ),
    );
    created += chunk.length;
    i18nCreated += chunk.length * 2;

    if (created % PROGRESS_EVERY === 0 || created === missing.length) {
      console.log(
        JSON.stringify({
          phase: "progress",
          created,
          of: missing.length,
          pct: missing.length ? Math.round((created / missing.length) * 100) : 100,
        }),
      );
    }
  }

  // Backfill empty i18n shells only where en/ar is missing (idempotent; never overwrites).
  const missingShellRows = await prisma.serviceLocation.findMany({
    where: {
      OR: [{ translations: { none: { locale: "en" } } }, { translations: { none: { locale: "ar" } } }],
    },
    select: { id: true },
  });
  let shellsFilled = 0;
  for (const row of missingShellRows) {
    shellsFilled += await ensureI18nShells(row.id);
  }

  const after = await counts();
  console.log(
    JSON.stringify(
      {
        phase: "after",
        ...after,
        created,
        i18nCreated,
        shellsFilled,
        publishedUnchanged: after.published === before.published,
      },
      null,
      2,
    ),
  );

  if (after.published !== before.published) {
    throw new Error(
      `Refusing silent publish drift: published was ${before.published}, now ${after.published}`,
    );
  }

  console.log("service-location matrix materialize COMPLETE");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
