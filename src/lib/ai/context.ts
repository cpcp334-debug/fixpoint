import { prisma } from "@/server/db";
import { parseJson } from "@/lib/utils";
import type { CatalogEmirate, CatalogGuide, CatalogService } from "@/lib/ai/provider";
import { getPublicQaForAi } from "@/lib/questions";

export async function loadAiContext(locale: string) {
  const [services, guides, emirates, publicQa] = await Promise.all([
    prisma.service.findMany({
      where: { status: "active", indexable: true },
      include: { translations: true },
    }),
    prisma.diyGuide.findMany({
      where: { status: "published", indexable: true },
      include: { translations: true, service: true },
    }),
    prisma.location.findMany({
      where: { type: "emirate", status: "active", indexable: true, serves: true },
      include: { translations: true },
      orderBy: { sortOrder: "asc" },
    }),
    getPublicQaForAi(locale),
  ]);

  const catalog: CatalogService[] = services.map((row) => {
    const t = row.translations.find((x) => x.locale === locale) ?? row.translations[0];
    return {
      slug: row.slug,
      name: t?.name || row.slug,
      riskLevel: row.riskLevel,
      diyAvailable: row.diyAvailable,
      intakeQuestions: parseJson<Array<{ en?: string; ar?: string } | string>>(row.aiIntakeQuestions, []).map((q) =>
        typeof q === "string" ? q : locale === "ar" ? q.ar || q.en || "" : q.en || q.ar || "",
      ),
    };
  });

  const catalogGuides: CatalogGuide[] = guides.map((row) => {
    const t = row.translations.find((x) => x.locale === locale) ?? row.translations[0];
    return {
      slug: row.slug,
      title: t?.title || row.slug,
      serviceSlug: row.service?.slug,
      riskLevel: row.riskLevel,
      categorySlug: row.categorySlug,
      quickAnswer: t?.quickAnswer,
    };
  });

  const catalogEmirates: CatalogEmirate[] = emirates.map((row) => {
    const t = row.translations.find((x) => x.locale === locale) ?? row.translations[0];
    return { slug: row.slug, name: t?.name || row.slug };
  });

  return { catalog, guides: catalogGuides, emirates: catalogEmirates, publicQa };
}
