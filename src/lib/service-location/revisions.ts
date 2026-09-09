import type { PrismaClient, ServiceLocationRevisionStatus } from "@prisma/client";
import type { WorkingCopy } from "./types";

export function workingCopySnapshot(copy: WorkingCopy) {
  return JSON.stringify({
    locale: copy.locale,
    intro: copy.intro,
    localInfo: copy.localInfo,
    seoTitle: copy.seoTitle,
    metaDescription: copy.metaDescription,
    faq: copy.faq,
    h1: copy.h1 ?? "",
    body: copy.body ?? "",
    directAnswer: copy.directAnswer ?? "",
    geoIntro: copy.geoIntro ?? "",
    imageAlt: copy.imageAlt ?? "",
  });
}

export async function publishRevision(
  prisma: PrismaClient,
  args: {
    serviceLocationId: string;
    locale: string;
    copy: WorkingCopy;
    generatedBy?: string;
    approvedBy: string;
    changeReason: string;
  },
) {
  const current = await prisma.serviceLocationRevision.findFirst({
    where: { serviceLocationId: args.serviceLocationId, locale: args.locale },
    orderBy: { revisionNumber: "desc" },
  });
  if (current?.status === "published") {
    await prisma.serviceLocationRevision.update({
      where: { id: current.id },
      data: { status: "superseded" satisfies ServiceLocationRevisionStatus },
    });
  }
  return prisma.serviceLocationRevision.create({
    data: {
      serviceLocationId: args.serviceLocationId,
      locale: args.locale,
      revisionNumber: (current?.revisionNumber ?? 0) + 1,
      snapshotJson: workingCopySnapshot(args.copy),
      generatedBy: args.generatedBy ?? "system",
      approvedBy: args.approvedBy,
      approvedAt: new Date(),
      changeReason: args.changeReason,
      previousRevisionId: current?.id ?? null,
      status: "published",
    },
  });
}
