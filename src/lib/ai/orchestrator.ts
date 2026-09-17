import { prisma } from "@/server/db";
import { whatsappUrl } from "@/config/site";
import { loadAiContext } from "@/lib/ai/context";
import { createConversation, getAuthorizedConversation } from "@/lib/ai/conversations";
import { failsafeProvider } from "@/lib/ai/failsafe";
import { logAiEvent } from "@/lib/ai/log";
import { openaiProvider } from "@/lib/ai/openai";
import type { ChatMessage } from "@/lib/ai/schema";
import { aiModelOutputSchema, type AiModelOutput, type CollectedLead } from "@/lib/ai/schema";
import { applySafetyGate, missingFrom } from "@/lib/ai/safety";
import { loadConversationImages } from "@/lib/ai/uploads";
import { userText } from "@/lib/ai/suggest";
import { createLead, updateAiLead } from "@/lib/leads";
import { createPublicBooking, detectBookingIntent } from "@/lib/bookings";
import { parseJson } from "@/lib/utils";
import { stampVisitor, trackServer } from "@/lib/analytics/server";

export class AiConversationAuthError extends Error {
  readonly status = 401 as const;
  constructor() {
    super("unauthorized");
    this.name = "AiConversationAuthError";
  }
}

export type AiChatResult = {
  reply: string;
  riskClass: "green" | "yellow" | "red";
  suggestedServiceSlug?: string;
  diySlug?: string;
  needsInspection: boolean;
  recommendProfessional: boolean;
  uncertain: boolean;
  photosUseful: boolean;
  collected: CollectedLead;
  missingFields: string[];
  handover: {
    available: boolean;
    leadId?: string;
    bookingNumber?: string;
    receiptPath?: string;
    whatsappUrl: string;
    quotePath: string;
    bookPath: string;
    inspectPath: string;
  };
  conversationId: string;
  uploadToken?: string;
  photoCount: number;
};

export async function runAlnajahAi(opts: {
  messages: ChatMessage[];
  locale: string;
  conversationId?: string;
  uploadToken?: string;
  photoIds?: string[];
  ip: string;
}): Promise<AiChatResult> {
  const started = Date.now();
  const ctx = await loadAiContext(opts.locale);
  const allowedEmirates = new Set(ctx.emirates.map((e) => e.slug));

  let conversationId = opts.conversationId;
  let uploadToken = opts.uploadToken;
  let issuedToken: string | undefined;

  if (conversationId || uploadToken) {
    if (!conversationId || !uploadToken) throw new AiConversationAuthError();
    const existing = await getAuthorizedConversation(conversationId, uploadToken);
    if (!existing) throw new AiConversationAuthError();
  } else {
    const created = await createConversation(opts.locale);
    conversationId = created.conversation.id;
    issuedToken = created.uploadToken;
    uploadToken = created.uploadToken;
    try {
      await stampVisitor({ conversationId });
      await trackServer("AI_OPEN", { locale: opts.locale });
    } catch {
      // Analytics must never fail the assistant.
    }
  }

  const conversation = await prisma.aiConversation.findUniqueOrThrow({ where: { id: conversationId } });
  const storedPhotoIds = parseJson<string[]>(conversation.photoIds, []);
  const requested = [...new Set([...(opts.photoIds || []), ...storedPhotoIds])].slice(0, 5);
  const images = process.env.OPENAI_API_KEY ? await loadConversationImages(conversationId, requested) : [];

  const provider = process.env.OPENAI_API_KEY ? openaiProvider : failsafeProvider;
  let rawText = "{}";
  let providerName: "openai" | "failsafe" = "failsafe";
  try {
    const raw = await provider.complete({
      locale: opts.locale,
      messages: opts.messages,
      catalog: ctx.catalog,
      guides: ctx.guides,
      emirates: ctx.emirates,
      images,
      publicQa: ctx.publicQa,
    });
    rawText = raw.text;
    providerName = raw.provider;
  } catch {
    const raw = await failsafeProvider.complete({
      locale: opts.locale,
      messages: opts.messages,
      catalog: ctx.catalog,
      guides: ctx.guides,
      emirates: ctx.emirates,
      images: [],
      publicQa: ctx.publicQa,
    });
    rawText = raw.text;
    providerName = "failsafe";
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    parsedJson = {};
  }
  const parsed = aiModelOutputSchema.safeParse(parsedJson);
  const model: AiModelOutput = parsed.success
    ? parsed.data
    : {
        reply:
          opts.locale === "ar"
            ? "لست متأكداً بما يكفي من المعلومات الحالية. يمكن طلب معاينة مهنية أو عرض سعر."
            : "I'm not confident enough from the current information. A professional inspection or quote request may be appropriate.",
        uncertain: true,
        recommendProfessional: true,
        needsInspection: true,
      };

  const gated = applySafetyGate({
    parsed: model,
    services: ctx.catalog,
    guides: ctx.guides,
    allowedEmirates,
    messages: opts.messages,
  });

  const collected = gated.collected ?? {};
  const transcript = userText(opts.messages);
  if (!collected.requirement && transcript.length >= 8) {
    collected.requirement = transcript.slice(0, 4000);
  }
  const missingFields = missingFrom(collected);

  let leadId = conversation.leadId || undefined;
  let leadCreated = false;
  let bookingNumber: string | undefined;
  const canLead = Boolean(collected.name && collected.phone && collected.requirement);
  if (canLead && collected.name && collected.phone && collected.requirement) {
    const payload = {
      name: collected.name,
      phone: collected.phone,
      email: collected.email,
      whatsapp: collected.phone,
      serviceSlug: gated.suggestedServiceSlug || collected.serviceSlug,
      locationSlug: collected.emirateSlug,
      propertyType: collected.propertyType,
      city: collected.city,
      area: collected.area,
      requirement: collected.requirement,
      urgency: collected.urgency,
      preferredDate: collected.preferredDate,
      preferredTime: collected.preferredTime,
      locale: opts.locale,
      source: "ai" as const,
      photoIds: requested,
      aiSummary: JSON.stringify({
        riskClass: gated.riskClass,
        suggestedServiceSlug: gated.suggestedServiceSlug,
        diySlug: gated.diySlug,
        uncertain: true,
      }),
    };
    if (leadId) {
      await updateAiLead(leadId, payload);
    } else {
      const created = await createLead(payload, opts.ip);
      if (created.ok && "id" in created && created.id) {
        leadId = created.id;
        leadCreated = !("duplicate" in created && created.duplicate);
      }
    }

    const bookingType = detectBookingIntent(transcript, collected.bookingType);
    if (bookingType && leadId) {
      const booking = await createPublicBooking(
        {
          type: bookingType,
          name: collected.name,
          phone: collected.phone,
          whatsapp: collected.phone,
          email: collected.email,
          serviceSlug: gated.suggestedServiceSlug || collected.serviceSlug,
          locationSlug: collected.emirateSlug,
          city: collected.city,
          area: collected.area,
          propertyType: collected.propertyType,
          requirement: collected.requirement,
          preferredDate: collected.preferredDate,
          preferredTime: collected.preferredTime,
          locale: opts.locale === "ar" ? "ar" : "en",
          source: "ai",
          leadId,
          conversationId,
          photoIds: requested,
        },
        opts.ip,
      );
      if (booking.ok && "number" in booking && booking.number) {
        bookingNumber = booking.number;
        const note =
          opts.locale === "ar"
            ? " سجّلت طلب حجز فقط. الموعد غير مؤكد بعد وسيراجع الفريق الطلب."
            : " I have recorded a booking request only. Your appointment is not confirmed yet; the team will review it.";
        if (!/not confirmed yet|غير مؤكد/i.test(gated.reply)) {
          gated.reply = `${gated.reply}${note}`.slice(0, 4000);
        }
      }
    }
  }

  const wa = whatsappUrl(
    [
      "Hello Al Najah Al Daem · Fixpoint",
      collected.name ? `Name: ${collected.name}` : "",
      gated.suggestedServiceSlug ? `Service: ${gated.suggestedServiceSlug}` : "",
      collected.emirateSlug ? `Emirate: ${collected.emirateSlug}` : "",
      collected.area ? `Area: ${collected.area}` : "",
      collected.requirement ? `Need: ${collected.requirement.slice(0, 300)}` : transcript.slice(0, 300),
      bookingNumber ? `Request ${bookingNumber} (not an appointment)` : "",
    ]
      .filter(Boolean)
      .join(". "),
  );

  await prisma.aiConversation.update({
    where: { id: conversationId },
    data: {
      locale: opts.locale,
      messages: JSON.stringify(opts.messages),
      summary: gated.reply.slice(0, 400),
      leadId: leadId || null,
      photoIds: JSON.stringify(requested),
    },
  });

  logAiEvent({
    provider: providerName,
    locale: opts.locale,
    riskClass: gated.riskClass,
    suggestedServiceSlug: gated.suggestedServiceSlug,
    diySlug: gated.diySlug,
    handover: gated.handoverRequested,
    leadCreated,
    photoCount: requested.length,
    durationMs: Date.now() - started,
    error: parsed.success ? undefined : "malformed",
  });

  try {
    await trackServer("AI_MESSAGE", { locale: opts.locale, meta: { riskClass: gated.riskClass || "yellow" } });
    if (gated.suggestedServiceSlug) {
      await trackServer("AI_SERVICE_SUGGESTION", {
        locale: opts.locale,
        entityType: "service",
        entityId: gated.suggestedServiceSlug,
        meta: { slug: gated.suggestedServiceSlug },
      });
    }
    if (gated.handoverRequested || leadCreated) {
      await trackServer("AI_HANDOVER", { locale: opts.locale });
    }
  } catch {
    // Analytics must never fail the assistant.
  }

  return {
    reply: gated.reply,
    riskClass: gated.riskClass ?? "yellow",
    suggestedServiceSlug: gated.suggestedServiceSlug,
    diySlug: gated.diySlug,
    needsInspection: Boolean(gated.needsInspection),
    recommendProfessional: Boolean(gated.recommendProfessional),
    uncertain: true,
    photosUseful: Boolean(gated.photosUseful),
    collected,
    missingFields,
    handover: {
      available: true,
      leadId,
      bookingNumber,
      receiptPath: bookingNumber ? `/book-a-service/received?ref=${encodeURIComponent(bookingNumber)}` : undefined,
      whatsappUrl: wa,
      quotePath: "/get-a-quote",
      bookPath: "/book-a-service",
      inspectPath: "/book-a-service?type=inspection",
    },
    conversationId,
    uploadToken: issuedToken,
    photoCount: requested.length,
  };
}
