import { z } from "zod";

export const riskClassSchema = z.enum(["green", "yellow", "red"]);
export type RiskClass = z.infer<typeof riskClassSchema>;

export const propertyTypeSchema = z.enum(["villa", "apartment", "office", "building", "other"]);
export const urgencySchema = z.enum(["normal", "urgent"]);

export const collectedLeadSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(8).max(20).optional(),
  email: z.string().trim().max(200).optional(),
  emirateSlug: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2).max(120).optional(),
  area: z.string().trim().min(2).max(120).optional(),
  propertyType: propertyTypeSchema.optional(),
  serviceSlug: z.string().trim().max(80).optional(),
  requirement: z.string().trim().min(8).max(4000).optional(),
  urgency: urgencySchema.optional(),
  photosUseful: z.boolean().optional(),
  preferredDate: z.string().trim().max(40).optional(),
  preferredTime: z.string().trim().max(40).optional(),
  bookingType: z.enum(["standard", "site_inspection", "emergency", "recurring_cleaning", "amc_visit"]).optional(),
  handoverRequested: z.boolean().optional(),
});

export type CollectedLead = z.infer<typeof collectedLeadSchema>;

export const aiModelOutputSchema = z.object({
  reply: z.string().trim().min(1).max(4000),
  suggestedServiceSlug: z.string().trim().max(80).optional(),
  diySlug: z.string().trim().max(120).optional(),
  riskClass: riskClassSchema.optional(),
  needsInspection: z.boolean().optional(),
  recommendProfessional: z.boolean().optional(),
  uncertain: z.boolean().optional(),
  photosUseful: z.boolean().optional(),
  collected: collectedLeadSchema.optional(),
  missingFields: z.array(z.string().max(40)).max(20).optional(),
  handoverRequested: z.boolean().optional(),
});

export type AiModelOutput = z.infer<typeof aiModelOutputSchema>;

export const chatRequestSchema = z.object({
  locale: z.enum(["en", "ar"]).default("en"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
  conversationId: z.string().trim().min(1).max(40).optional(),
  uploadToken: z.string().trim().min(16).max(128).optional(),
  photoIds: z.array(z.string().trim().min(1).max(40)).max(5).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatMessage = ChatRequest["messages"][number];
