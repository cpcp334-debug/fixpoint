type AiLog = {
  provider: "openai" | "failsafe";
  locale: string;
  riskClass?: string;
  suggestedServiceSlug?: string;
  diySlug?: string;
  handover?: boolean;
  leadCreated?: boolean;
  photoCount?: number;
  durationMs: number;
  error?: string;
};

export function logAiEvent(event: AiLog) {
  console.info("[alnajah-ai]", JSON.stringify(event));
}
