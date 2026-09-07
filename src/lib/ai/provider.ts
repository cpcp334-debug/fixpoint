import type { ChatMessage } from "@/lib/ai/schema";

export type CatalogService = {
  slug: string;
  name: string;
  riskLevel: "green" | "yellow" | "red";
  diyAvailable: boolean;
  intakeQuestions: string[];
};

export type CatalogGuide = {
  slug: string;
  title: string;
  serviceSlug?: string | null;
  riskLevel: "green" | "yellow" | "red";
  categorySlug?: string;
  quickAnswer?: string;
};

export type CatalogEmirate = {
  slug: string;
  name: string;
};

export type PublicQa = {
  question: string;
  answer: string;
  serviceSlug?: string;
  guideSlug?: string;
};

export type ProviderImage = {
  mimeType: string;
  base64: string;
};

export type ProviderInput = {
  locale: string;
  messages: ChatMessage[];
  catalog: CatalogService[];
  guides: CatalogGuide[];
  emirates: CatalogEmirate[];
  images: ProviderImage[];
  publicQa?: PublicQa[];
};

export type ProviderRaw = {
  text: string;
  provider: "openai" | "failsafe";
};

export interface AiProvider {
  complete(input: ProviderInput): Promise<ProviderRaw>;
}
