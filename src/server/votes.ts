"use server";

import { prisma } from "@/server/db";
import { headers } from "next/headers";
import { clientIp, rateLimit } from "@/server/rate-limit";

export async function voteGuide(guideId: string, helpful: boolean) {
  const hdrs = await headers();
  const limited = rateLimit(`vote:${clientIp(hdrs)}:${guideId}`, 5, 60 * 60 * 1000);
  if (!limited.ok) return { ok: false };
  const guide = await prisma.diyGuide.findFirst({
    where: { id: guideId, status: "published", indexable: true },
    select: { id: true },
  });
  if (!guide) return { ok: false };
  await prisma.diyVote.create({ data: { guideId, helpful } });
  return { ok: true };
}
