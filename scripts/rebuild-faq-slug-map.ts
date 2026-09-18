/**
 * Rebuild scripts/_slug-maps.json → faq after Latin FAQ restore.
 * latin `faq-*` → Arabic public form (أسئلة-{arabicServiceSlug}), uniquified.
 *
 * Usage: npx tsx scripts/rebuild-faq-slug-map.ts
 */
import "./load-env-mysql";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { SERVICE_FAQ_CATEGORY, SERVICE_FAQ_SLUG_PREFIX } from "../src/lib/faq/service-faq";
import { toArabicSlug } from "../src/lib/slug/arabic-slug";
import { parseJson } from "../src/lib/utils";

const MAP_PATH = join(process.cwd(), "scripts/_slug-maps.json");
const FAQ_MAP_PATH = join(process.cwd(), "scripts/_faq-slug-map.json");

async function main() {
  if (!existsSync(MAP_PATH)) throw new Error(`Missing ${MAP_PATH}`);
  const maps = JSON.parse(readFileSync(MAP_PATH, "utf8")) as {
    service?: Record<string, string>;
    faq?: Record<string, string>;
  };
  const serviceForward = maps.service || {};

  const rows = await prisma.article.findMany({
    where: { categorySlugs: { contains: SERVICE_FAQ_CATEGORY } },
    select: { slug: true, relatedServiceSlugs: true },
    orderBy: { slug: "asc" },
  });

  const taken = new Set<string>();
  const faq: Record<string, string> = {};

  for (const row of rows) {
    if (!row.slug.startsWith(SERVICE_FAQ_SLUG_PREFIX)) continue;
    const rel = parseJson<string[]>(row.relatedServiceSlugs, []);
    const svc = rel[0] || row.slug.slice(SERVICE_FAQ_SLUG_PREFIX.length);
    const arSvc = serviceForward[svc] || svc;
    let next = toArabicSlug(`أسئلة-${arSvc}`);
    let i = 2;
    while (taken.has(next)) {
      next = toArabicSlug(`أسئلة-${arSvc}-${i}`);
      i += 1;
    }
    taken.add(next);
    faq[row.slug] = next;
  }

  maps.faq = faq;
  const payload = JSON.stringify(maps, null, 2);
  writeFileSync(MAP_PATH, payload, "utf8");
  writeFileSync(FAQ_MAP_PATH, JSON.stringify(faq, null, 2), "utf8");

  const verify = JSON.parse(readFileSync(MAP_PATH, "utf8")) as { faq?: Record<string, string> };
  console.log(
    JSON.stringify(
      {
        rows: rows.length,
        faqWritten: Object.keys(faq).length,
        faqVerified: Object.keys(verify.faq || {}).length,
        sample: Object.fromEntries(Object.entries(faq).slice(0, 6)),
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
