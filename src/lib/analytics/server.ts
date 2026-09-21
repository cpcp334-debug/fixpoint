import { cookies } from "next/headers";
import { prisma } from "@/server/db";
import { isOpaqueId, OPTOUT_COOKIE, SID_COOKIE, VID_COOKIE } from "@/lib/analytics/cookies";
import {
  sanitizeMeta,
  sanitizePath,
  type AnalyticsEventName,
} from "@/lib/analytics/types";
import {
  attributionToColumns,
  mergeFirstTouch,
  sanitizeAttribution,
} from "@/lib/attribution/shared";
import type { AttributionPayload } from "@/lib/attribution/types";

export type VisitorContext = { visitorId: string; sessionId: string };

export async function peekVisitor(): Promise<VisitorContext | null> {
  try {
    const jar = await cookies();
    if (jar.get(OPTOUT_COOKIE)?.value === "1") return null;
    const visitorId = jar.get(VID_COOKIE)?.value;
    const sessionId = jar.get(SID_COOKIE)?.value;
    if (!isOpaqueId(visitorId) || !isOpaqueId(sessionId)) return null;
    const session = await prisma.visitSession.findFirst({
      where: { id: sessionId, visitorId, visitor: { optedOut: false } },
      select: { id: true, visitorId: true },
    });
    if (!session) return null;
    return { visitorId: session.visitorId, sessionId: session.id };
  } catch {
    return null;
  }
}

export async function stampVisitor(ids: {
  leadId?: string;
  bookingId?: string;
  customerId?: string;
  reviewId?: string;
  questionId?: string;
  conversationId?: string;
}) {
  try {
    const ctx = await peekVisitor();
    if (!ctx) return null;
    if (ids.leadId) {
      await prisma.lead.update({ where: { id: ids.leadId }, data: { visitorId: ctx.visitorId } });
    }
    if (ids.bookingId) {
      await prisma.booking.update({ where: { id: ids.bookingId }, data: { visitorId: ctx.visitorId } });
    }
    if (ids.reviewId) {
      await prisma.review.update({ where: { id: ids.reviewId }, data: { visitorId: ctx.visitorId } });
    }
    if (ids.questionId) {
      await prisma.question.update({ where: { id: ids.questionId }, data: { visitorId: ctx.visitorId } });
    }
    if (ids.conversationId) {
      await prisma.aiConversation.update({
        where: { id: ids.conversationId },
        data: { visitorId: ctx.visitorId },
      });
    }
    if (ids.customerId) {
      const row = await prisma.customer.findUnique({
        where: { id: ids.customerId },
        select: { visitorId: true },
      });
      if (row && !row.visitorId) {
        await prisma.customer.update({
          where: { id: ids.customerId },
          data: { visitorId: ctx.visitorId },
        });
        await prisma.visitor.updateMany({
          where: { id: ctx.visitorId, customerId: null },
          data: { customerId: ids.customerId },
        });
      }
    }
    return ctx;
  } catch {
    return null;
  }
}

export async function trackServer(
  name: AnalyticsEventName,
  extra?: {
    locale?: string;
    path?: string;
    entityType?: string;
    entityId?: string;
    meta?: Record<string, unknown>;
  },
) {
  try {
    const ctx = await peekVisitor();
    if (!ctx) return;
    await prisma.analyticsEvent.create({
      data: {
        visitorId: ctx.visitorId,
        sessionId: ctx.sessionId,
        name,
        path: extra?.path ? sanitizePath(extra.path) : null,
        locale: extra?.locale === "ar" || extra?.locale === "en" ? extra.locale : null,
        entityType: extra?.entityType?.slice(0, 40) || null,
        entityId: extra?.entityId?.slice(0, 80) || null,
        meta: JSON.stringify(sanitizeMeta(extra?.meta)),
        source: "server",
      },
    });
    await prisma.visitor.update({
      where: { id: ctx.visitorId },
      data: { lastSeenAt: new Date() },
    });
  } catch {
    // Analytics must never fail a business write.
  }
}

/** Retention helper (13 months). Not scheduled in 2F.1; call from a later cron. */
export async function pruneExpiredAnalytics() {
  const cutoff = new Date(Date.now() - 397 * 24 * 60 * 60 * 1000);
  await prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
}

/** First-touch only: fill blank Visitor attribution fields from sanitized payload. */
export async function stampVisitorAttribution(raw: unknown) {
  try {
    const incoming = sanitizeAttribution(raw);
    if (!incoming) return null;
    const ctx = await peekVisitor();
    if (!ctx) return null;
    const row = await prisma.visitor.findUnique({
      where: { id: ctx.visitorId },
      select: {
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        utmTerm: true,
        utmContent: true,
        gclid: true,
        gbraid: true,
        wbraid: true,
        landingPath: true,
      },
    });
    if (!row) return null;
    const existing: AttributionPayload = {
      ...(row.utmSource ? { utm_source: row.utmSource } : {}),
      ...(row.utmMedium ? { utm_medium: row.utmMedium } : {}),
      ...(row.utmCampaign ? { utm_campaign: row.utmCampaign } : {}),
      ...(row.utmTerm ? { utm_term: row.utmTerm } : {}),
      ...(row.utmContent ? { utm_content: row.utmContent } : {}),
      ...(row.gclid ? { gclid: row.gclid } : {}),
      ...(row.gbraid ? { gbraid: row.gbraid } : {}),
      ...(row.wbraid ? { wbraid: row.wbraid } : {}),
      ...(row.landingPath ? { landing_path: row.landingPath } : {}),
    };
    const merged = mergeFirstTouch(existing, incoming);
    if (!merged) return null;
    const cols = attributionToColumns(merged);
    await prisma.visitor.update({ where: { id: ctx.visitorId }, data: cols });
    return ctx;
  } catch {
    return null;
  }
}
