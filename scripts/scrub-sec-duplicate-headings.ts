/**
 * Scrub SEC ArticleI18n bodies that padToWords duplicated heading blocks into.
 * Collapses repeated "## …" sections that share the same title (keep first).
 * Does NOT change Article.slug.
 *
 * Usage:
 *   npx tsx scripts/scrub-sec-duplicate-headings.ts --dry-run --limit=20
 *   npx tsx scripts/scrub-sec-duplicate-headings.ts --batch=200
 */
import "./load-env-mysql";
import { prisma } from "../src/server/db";

function parseArgs(argv: string[]) {
  let dryRun = false;
  let limit = 0;
  let batch = 200;
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a.startsWith("--limit=")) limit = Math.max(0, Number(a.slice(8)) || 0);
    else if (a.startsWith("--batch=")) batch = Math.max(1, Number(a.slice(8)) || 200);
  }
  return { dryRun, limit, batch };
}

/** Split on ## headings; keep first occurrence of each heading title. */
export function dedupeHeadingSections(body: string): { text: string; removed: number } {
  const raw = body.replace(/\r\n/g, "\n");
  if (!raw.includes("## ")) return { text: body, removed: 0 };

  const parts = raw.split(/(?=^## )/m);
  const seen = new Set<string>();
  const out: string[] = [];
  let removed = 0;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("## ")) {
      const title = trimmed.split("\n")[0]!.replace(/^##\s+/, "").trim();
      if (seen.has(title)) {
        removed += 1;
        continue;
      }
      seen.add(title);
    }
    out.push(trimmed);
  }

  return { text: out.join("\n\n"), removed };
}

async function main() {
  const { dryRun, limit, batch } = parseArgs(process.argv.slice(2));

  const rows = await prisma.articleI18n.findMany({
    where: {
      OR: [
        { body: { contains: "## أسئلة قبل الحجز" } },
        { body: { contains: "## Questions before you book" } },
        { body: { contains: "## كيف تقيّم أول رد" } },
        { body: { contains: "## How to judge the first reply" } },
      ],
    },
    select: { articleId: true, locale: true, body: true },
    take: limit > 0 ? limit : undefined,
  });

  let scanned = 0;
  let updated = 0;
  let removedSections = 0;
  const samples: Array<{ articleId: string; locale: string; removed: number }> = [];

  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    for (const row of chunk) {
      scanned += 1;
      const { text, removed } = dedupeHeadingSections(row.body || "");
      if (removed < 1 || text === row.body) continue;
      removedSections += removed;
      updated += 1;
      if (samples.length < 12) samples.push({ articleId: row.articleId, locale: row.locale, removed });
      if (!dryRun) {
        await prisma.articleI18n.update({
          where: { articleId_locale: { articleId: row.articleId, locale: row.locale } },
          data: { body: text },
        });
      }
    }
    console.error(JSON.stringify({ progress: scanned, updated, removedSections }));
  }

  console.log(JSON.stringify({ dryRun, scanned, updated, removedSections, samples }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
