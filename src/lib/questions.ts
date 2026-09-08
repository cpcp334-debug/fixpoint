import { z } from "zod";
import { prisma } from "@/server/db";
import { rateLimit } from "@/server/rate-limit";
import { stampVisitor, trackServer } from "@/lib/analytics/server";
import { emitDomainEventSafe } from "@/lib/automation/emit";

export const publicQuestionSchema = z.object({
  askerName: z.string().trim().max(80).optional(),
  body: z.string().trim().min(8).max(2000),
  serviceSlug: z.string().trim().max(80).optional(),
  locationSlug: z.string().trim().max(80).optional(),
  guideSlug: z.string().trim().max(120).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  website: z.string().optional(),
});

export async function createPublicQuestion(input: z.infer<typeof publicQuestionSchema>, ip: string) {
  if (input.website) return { ok: true as const, ignored: true };
  const parsed = publicQuestionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };

  const limited = await rateLimit(`qa:${ip}`, 5, 60 * 60 * 1000);
  if (!limited.ok) return { ok: false as const, error: "rateLimit" as const };

  const data = parsed.data;
  const service = data.serviceSlug
    ? await prisma.service.findFirst({ where: { slug: data.serviceSlug, status: "active", indexable: true } })
    : null;
  const location = data.locationSlug
    ? await prisma.location.findFirst({
        where: { slug: data.locationSlug, status: "active", indexable: true, serves: true },
      })
    : null;
  const guide = data.guideSlug
    ? await prisma.diyGuide.findFirst({ where: { slug: data.guideSlug, status: "published", indexable: true } })
    : null;
  if (data.guideSlug && !guide) return { ok: false as const, error: "invalid" as const };
  if (data.serviceSlug && !service) return { ok: false as const, error: "invalid" as const };

  const dup = await prisma.question.findFirst({
    where: {
      body: data.body,
      createdAt: { gt: new Date(Date.now() - 2 * 60 * 1000) },
    },
  });
  if (dup) return { ok: true as const, duplicate: true, id: dup.id };

  const row = await prisma.question.create({
    data: {
      askerName: data.askerName || "",
      body: data.body,
      serviceId: service?.id,
      locationId: location?.id,
      guideId: guide?.id,
      status: "draft",
      moderationStatus: "PENDING",
      locale: data.locale || "en",
    },
  });
  try {
    await stampVisitor({ questionId: row.id });
    await trackServer("QUESTION_SUBMIT", { locale: data.locale });
  } catch {
    // Analytics must never fail a question write.
  }
  await emitDomainEventSafe({
    trigger: "QNA_RECEIVED",
    subjectId: row.id,
    occurrenceKey: "received",
    payload: { moderationStatus: "PENDING" },
  });
  return { ok: true as const, id: row.id };
}

export async function getApprovedQuestions(opts: {
  serviceId?: string;
  locationId?: string;
  guideId?: string;
  take?: number;
}) {
  return prisma.question.findMany({
    where: {
      moderationStatus: "APPROVED",
      status: "published",
      answer: { not: "" },
      serviceId: opts.serviceId,
      locationId: opts.locationId,
      guideId: opts.guideId,
    },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 30,
  });
}

export async function getPublicQaForAi(locale: string) {
  const rows = await prisma.question.findMany({
    where: { moderationStatus: "APPROVED", status: "published", answer: { not: "" } },
    include: { service: true, guide: true },
    take: 40,
    orderBy: { updatedAt: "desc" },
  });
  return rows
    .filter((row) => !row.locale || row.locale === locale)
    .map((row) => ({
      question: row.body,
      answer: row.answer,
      serviceSlug: row.service?.slug,
      guideSlug: row.guide?.slug,
    }));
}
