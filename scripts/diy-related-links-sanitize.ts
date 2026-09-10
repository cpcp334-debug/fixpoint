/**
 * Sanitize public DIY relatedSlugs to published+indexable targets only.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { parseJson } from "../src/lib/utils";

async function main() {
  const published = await prisma.diyGuide.findMany({
    where: { status: "published", indexable: true },
    select: { id: true, slug: true, relatedSlugs: true, categorySlug: true },
  });
  const publishedSet = new Set(published.map((g) => g.slug));

  const audit = {
    publicGuidesAudited: published.length,
    totalRelatedLinks: 0,
    unpublishedTargetsFound: 0,
    removedLinks: [] as Array<{ from: string; to: string }>,
    replacedLinks: [] as Array<{ from: string; fromTarget: string; to: string }>,
    brokenLinks: 0,
    finalPublicSafeRelatedLinks: 0,
  };

  for (const guide of published) {
    const related = parseJson<string[]>(guide.relatedSlugs, []);
    audit.totalRelatedLinks += related.length;
    const kept: string[] = [];
    for (const target of related) {
      if (target === guide.slug) continue;
      if (publishedSet.has(target)) {
        kept.push(target);
        continue;
      }
      audit.unpublishedTargetsFound += 1;
      audit.removedLinks.push({ from: guide.slug, to: target });
      // Prefer same-category published replacement if available
      const replacement = published.find(
        (g) => g.slug !== guide.slug && g.categorySlug === guide.categorySlug && !kept.includes(g.slug),
      );
      if (replacement) {
        kept.push(replacement.slug);
        audit.replacedLinks.push({ from: guide.slug, fromTarget: target, to: replacement.slug });
      }
    }
    const unique = [...new Set(kept)];
    audit.finalPublicSafeRelatedLinks += unique.length;
    await prisma.diyGuide.update({
      where: { id: guide.id },
      data: {
        relatedSlugs: JSON.stringify(unique),
        updatedBy: "diy-related-links-sanitize",
      },
    });
  }

  writeFileSync(join(process.cwd(), "docs/diy-related-links-audit.json"), JSON.stringify(audit, null, 2));
  writeFileSync(
    join(process.cwd(), "docs/diy-related-links-audit.md"),
    [
      `# DIY related-links audit`,
      ``,
      `- Public guides audited: ${audit.publicGuidesAudited}`,
      `- Total related links before: ${audit.totalRelatedLinks}`,
      `- Unpublished targets found: ${audit.unpublishedTargetsFound}`,
      `- Removed: ${audit.removedLinks.length}`,
      `- Replaced with published same-category: ${audit.replacedLinks.length}`,
      `- Final public-safe related links: ${audit.finalPublicSafeRelatedLinks}`,
      ``,
      `## Removed`,
      ...audit.removedLinks.map((r) => `- ${r.from} → ${r.to}`),
      ``,
      `## Replaced`,
      ...audit.replacedLinks.map((r) => `- ${r.from}: ${r.fromTarget} → ${r.to}`),
      ``,
    ].join("\n"),
  );
  console.log(JSON.stringify(audit, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
