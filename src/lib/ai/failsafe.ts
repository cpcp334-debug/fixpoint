import type { AiProvider, ProviderInput, ProviderRaw } from "@/lib/ai/provider";
import { userText } from "@/lib/ai/suggest";

export const failsafeProvider: AiProvider = {
  async complete(input: ProviderInput): Promise<ProviderRaw> {
    const text = userText(input.messages);
    const ar = input.locale === "ar";
    const reply = ar
      ? "المساعد غير مُعد أو غير متاح للتشخيص الآلي الآن. صف المشكلة والاسم ورقم الهاتف والإمارة إن أحببت. يمكنك رفع صور اختيارياً أو تخطي الرفع أو المراسلة عبر واتساب. لن أقدم خطوات خطرة ولن أخترع سعراً أو تشخيصاً."
      : "The assistant is not configured or cannot complete an automated assessment right now. Share the problem, your name, phone, and emirate if you like. You can optionally upload photos, skip upload, or WhatsApp us. I will not give hazardous steps or invent a price or diagnosis.";
    const payload = {
      reply,
      uncertain: true,
      recommendProfessional: true,
      needsInspection: true,
      photosUseful: true,
      handoverRequested: true,
      collected: {
        requirement: text.length >= 8 ? text.slice(0, 4000) : undefined,
      },
    };
    return { text: JSON.stringify(payload), provider: "failsafe" };
  },
};
