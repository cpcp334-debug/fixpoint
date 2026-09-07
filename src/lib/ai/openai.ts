import type { AiProvider, ProviderInput, ProviderRaw } from "@/lib/ai/provider";
import { failsafeProvider } from "@/lib/ai/failsafe";
import { buildCatalogLines } from "@/lib/ai/suggest";

const TIMEOUT_MS = 12_000;

const SYSTEM = `You are ALNAJAH AI for ALNAJAH ALDAEM (UAE cleaning and building maintenance).
Help first, sell second, safety always. Reply in the customer's language (English or Arabic).

Never invent: prices, discounts, wait times, availability, licenses, certifications, reviews, projects, awards, years of experience, or a definite technical diagnosis.
Never claim the customer definitely has a specific fault. Photos are preliminary only — say you cannot confirm a diagnosis from an image.
Prefer: "Based on the information you provided, you may need..."
If unsure, say so and recommend inspection.
Public licenses only: Sharjah cleaning 925212 (Internal Building Cleaning Services); Ajman maintenance 132954 (Building Maintenance). Do not claim a license in every emirate.
Enquiries accepted for seven UAE emirates for ACTIVE services only. Never offer draft services.
RED / no repair steps: live electrical work, gas, refrigerant, demolition, dangerous height, major structural repairs, burning smell, water on electrics. Symptoms, why to stop, request a professional.
DIY links only if a published guide slug is listed below and the task is clearly that guide. Never recommend Draft, Review, or Archived guides. Never give repair steps for RED hazards.
Ask only relevant missing fields: name, phone/WhatsApp, email if useful, emirate, city/area, property type, requirement, urgency, photos (optional — customer may skip), preferred date/time if booking is discussed. Booking times are requests, not confirmed appointments. Never say a slot is reserved, a technician is assigned, or that you are available today/tomorrow.
Offer quote, booking request, site inspection request, WhatsApp, or call for professional help.

Return JSON only:
{
  "reply": "string",
  "suggestedServiceSlug": "active slug or omit",
  "diySlug": "published guide slug or omit",
  "riskClass": "green|yellow|red",
  "needsInspection": boolean,
  "recommendProfessional": boolean,
  "uncertain": boolean,
  "photosUseful": boolean,
  "handoverRequested": boolean,
  "collected": {
    "name": "optional",
    "phone": "optional",
    "email": "optional",
    "emirateSlug": "optional",
    "area": "optional",
    "propertyType": "villa|apartment|office|building|other",
    "serviceSlug": "optional",
    "requirement": "optional",
    "urgency": "normal|urgent",
    "preferredDate": "optional",
    "preferredTime": "optional",
    "bookingType": "standard|site_inspection|emergency|recurring_cleaning|amc_visit or omit"
  },
  "missingFields": ["name","phone","emirate"]
}`;

export const openaiProvider: AiProvider = {
  async complete(input: ProviderInput): Promise<ProviderRaw> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return failsafeProvider.complete(input);

    const { serviceLines, guideLines, emirateLines } = buildCatalogLines(
      input.catalog,
      input.guides,
      input.emirates,
    );

    const qaLines = (input.publicQa || [])
      .map((item) => `Q: ${item.question}\nA: ${item.answer}${item.serviceSlug ? ` [${item.serviceSlug}]` : ""}`)
      .join("\n");
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: key, timeout: TIMEOUT_MS });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
    const history = input.messages.filter((m) => m !== lastUser).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [{ type: "text", text: lastUser?.content || "" }];
    for (const image of input.images) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
      });
    }

    try {
      const response = await client.chat.completions.create(
        {
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `${SYSTEM}\n\nActive services:\n${serviceLines}\n\nPublished DIY:\n${guideLines || "(none)"}\n\nEmirates: ${emirateLines}\nApproved public Q&A (no private names or pending items):\n${qaLines || "(none)"}\nImages if present are preliminary only.`,
            },
            ...history,
            { role: "user", content: userContent },
          ],
        },
        { signal: controller.signal },
      );
      const text = response.choices[0]?.message?.content || "{}";
      return { text, provider: "openai" };
    } catch {
      return failsafeProvider.complete(input);
    } finally {
      clearTimeout(timer);
    }
  },
};
