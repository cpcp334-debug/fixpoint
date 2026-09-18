/**
 * Public AI chat + Co-Founder both use OpenAI via OPENAI_API_KEY.
 * Empty / whitespace-only values count as unset (Hostinger failsafe path).
 */
export function openAiApiKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || undefined;
}

export function isOpenAiConfigured(): boolean {
  return Boolean(openAiApiKey());
}
