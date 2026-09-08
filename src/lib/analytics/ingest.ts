import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { clientIp, rateLimit } from "@/server/rate-limit";
import {
  cookieBase,
  isOpaqueId,
  OPTOUT_COOKIE,
  readCookie,
  SESSION_MAX_AGE,
  SESSION_TTL_MS,
  SID_COOKIE,
  VID_COOKIE,
  VISITOR_MAX_AGE,
} from "@/lib/analytics/cookies";
import {
  CLIENT_EVENT_NAMES,
  MAX_BATCH,
  MAX_BODY_BYTES,
  MAX_PATH,
  sanitizeMeta,
  sanitizePath,
  type ClientEventName,
} from "@/lib/analytics/types";

const clientEventSchema = z.object({
  n: z.enum(CLIENT_EVENT_NAMES),
  p: z.string().max(MAX_PATH).optional(),
  e: z.string().max(40).optional(),
  i: z.string().max(80).optional(),
  m: z.unknown().optional(),
});

const bodySchema = z.object({
  events: z.array(clientEventSchema).min(1).max(MAX_BATCH),
  locale: z.enum(["en", "ar"]).optional(),
});

type IngestEvent = z.infer<typeof clientEventSchema>;

function empty(status = 204) {
  return new NextResponse(null, { status });
}

function applyCookies(res: NextResponse, vid: string, sid: string) {
  const base = cookieBase();
  res.cookies.set(VID_COOKIE, vid, { ...base, maxAge: VISITOR_MAX_AGE });
  res.cookies.set(SID_COOKIE, sid, { ...base, maxAge: SESSION_MAX_AGE });
  return res;
}

function applyOptOut(res: NextResponse) {
  const base = cookieBase();
  res.cookies.set(OPTOUT_COOKIE, "1", { ...base, maxAge: VISITOR_MAX_AGE });
  res.cookies.delete(VID_COOKIE);
  res.cookies.delete(SID_COOKIE);
  return res;
}

async function resolveIdentity(header: string | null, locale?: string) {
  const optedOut = readCookie(header, OPTOUT_COOKIE) === "1";
  if (optedOut) return { optedOut: true as const };

  const now = new Date();
  let visitorId = readCookie(header, VID_COOKIE);
  let sessionId = readCookie(header, SID_COOKIE);

  if (isOpaqueId(visitorId)) {
    const visitor = await prisma.visitor.findUnique({ where: { id: visitorId } });
    if (!visitor || visitor.optedOut) return { optedOut: true as const };
    await prisma.visitor.update({
      where: { id: visitor.id },
      data: { lastSeenAt: now, locale: locale || visitor.locale },
    });
    visitorId = visitor.id;
  } else {
    const visitor = await prisma.visitor.create({
      data: { locale: locale || null, lastSeenAt: now },
    });
    visitorId = visitor.id;
    sessionId = null;
  }

  if (isOpaqueId(sessionId)) {
    const session = await prisma.visitSession.findFirst({
      where: { id: sessionId, visitorId },
    });
    if (session && now.getTime() - session.lastSeenAt.getTime() < SESSION_TTL_MS) {
      await prisma.visitSession.update({ where: { id: session.id }, data: { lastSeenAt: now } });
      return { optedOut: false as const, visitorId, sessionId: session.id };
    }
  }

  const session = await prisma.visitSession.create({
    data: { visitorId, lastSeenAt: now },
  });
  return { optedOut: false as const, visitorId, sessionId: session.id };
}

function toRows(
  events: IngestEvent[],
  visitorId: string,
  sessionId: string,
  fallbackLocale?: "en" | "ar",
) {
  return events.map((event) => ({
    visitorId,
    sessionId,
    name: event.n as ClientEventName,
    path: event.p ? sanitizePath(event.p) : null,
    locale: fallbackLocale || null,
    entityType: event.e || null,
    entityId: event.i || null,
    meta: JSON.stringify(sanitizeMeta(event.m)),
    source: "client",
  }));
}

export async function ingestClientEvents(request: Request) {
  const ip = clientIp(request.headers);
  const limited = await rateLimit(`t:${ip}`, 60, 10 * 60 * 1000, { onStoreError: "open" });
  if (!limited.ok) return empty(429);

  const length = Number(request.headers.get("content-length") || "0");
  if (length > MAX_BODY_BYTES) return empty(204);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return empty(204);
  }
  if (JSON.stringify(json).length > MAX_BODY_BYTES) return empty(204);

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return empty(204);

  const cookieHeader = request.headers.get("cookie");
  try {
    const identity = await resolveIdentity(cookieHeader, parsed.data.locale);
    if (identity.optedOut) return applyOptOut(empty(204));

    await prisma.analyticsEvent.createMany({
      data: toRows(parsed.data.events, identity.visitorId, identity.sessionId, parsed.data.locale),
    });
    return applyCookies(empty(204), identity.visitorId, identity.sessionId);
  } catch {
    return empty(204);
  }
}

export async function applyAnalyticsOptOut(request: Request, response?: NextResponse) {
  const cookieHeader = request.headers.get("cookie");
  const visitorId = readCookie(cookieHeader, VID_COOKIE);
  if (isOpaqueId(visitorId)) {
    await prisma.visitor.updateMany({ where: { id: visitorId }, data: { optedOut: true } }).catch(() => undefined);
  }
  return applyOptOut(response ?? empty(204));
}
