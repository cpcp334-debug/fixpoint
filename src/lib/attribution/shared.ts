import { z } from "zod";
import type { AttributionColumns, AttributionPayload } from "@/lib/attribution/types";
import { ATTRIBUTION_KEYS } from "@/lib/attribution/types";

const valueSchema = z.string().trim().min(1).max(200);

export const attributionInputSchema = z
  .object({
    utm_source: valueSchema.optional(),
    utm_medium: valueSchema.optional(),
    utm_campaign: valueSchema.optional(),
    utm_term: valueSchema.optional(),
    utm_content: valueSchema.optional(),
    gclid: valueSchema.optional(),
    gbraid: valueSchema.optional(),
    wbraid: valueSchema.optional(),
    landing_path: z.string().trim().min(1).max(500).optional(),
    captured_at: z.string().trim().max(40).optional(),
  })
  .strict()
  .optional();

export type AttributionInput = z.infer<typeof attributionInputSchema>;

function cleanToken(raw: unknown, max = 200): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().slice(0, max);
  if (!v) return undefined;
  if (/[@\s<>]/.test(v)) return undefined;
  return v;
}

function cleanPath(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().slice(0, 500);
  if (!v.startsWith("/")) return undefined;
  if (v.includes("?") || v.includes("#") || v.includes("//")) return undefined;
  return v;
}

/** Parse + sanitize client attribution; empty object → null. */
export function sanitizeAttribution(input: unknown): AttributionPayload | null {
  if (!input || typeof input !== "object") return null;
  const src = input as Record<string, unknown>;
  const out: AttributionPayload = {};
  for (const key of ATTRIBUTION_KEYS) {
    const v = cleanToken(src[key]);
    if (v) out[key] = v;
  }
  const path = cleanPath(src.landing_path);
  if (path) out.landing_path = path;
  const at = cleanToken(src.captured_at, 40);
  if (at) out.captured_at = at;
  return Object.keys(out).length ? out : null;
}

/** Map sanitized payload → Prisma create data. */
export function attributionToColumns(attr: AttributionPayload | null | undefined): Partial<AttributionColumns> {
  if (!attr) return {};
  return {
    ...(attr.utm_source ? { utmSource: attr.utm_source } : {}),
    ...(attr.utm_medium ? { utmMedium: attr.utm_medium } : {}),
    ...(attr.utm_campaign ? { utmCampaign: attr.utm_campaign } : {}),
    ...(attr.utm_term ? { utmTerm: attr.utm_term } : {}),
    ...(attr.utm_content ? { utmContent: attr.utm_content } : {}),
    ...(attr.gclid ? { gclid: attr.gclid } : {}),
    ...(attr.gbraid ? { gbraid: attr.gbraid } : {}),
    ...(attr.wbraid ? { wbraid: attr.wbraid } : {}),
    ...(attr.landing_path ? { landingPath: attr.landing_path } : {}),
  };
}

/**
 * First-touch merge: keep existing non-empty fields; fill blanks from incoming.
 * Never overwrite a stored click id / UTM with a later value.
 */
export function mergeFirstTouch(
  existing: AttributionPayload | null | undefined,
  incoming: AttributionPayload | null | undefined,
): AttributionPayload | null {
  if (!existing && !incoming) return null;
  if (!existing) return incoming ? { ...incoming } : null;
  if (!incoming) return { ...existing };
  const out: AttributionPayload = { ...existing };
  for (const key of [...ATTRIBUTION_KEYS, "landing_path" as const, "captured_at" as const]) {
    const cur = out[key];
    const next = incoming[key];
    if ((!cur || !String(cur).trim()) && next) {
      out[key] = next;
    }
  }
  return out;
}
