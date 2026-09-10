import type { EngineIssue } from "../config/types";

const DIY_MARKERS = [
  /diy|self[- ]?help|what you can (try|check)|safe checks/i,
  /ما يمكنك|إرشادات|ساعد نفسك|فحوصات آمنة/,
];

export function validateDiySelfHelp(body: string, required: boolean): EngineIssue[] {
  if (!required) return [];
  const ok = DIY_MARKERS.some((re) => re.test(body || ""));
  if (!ok) {
    return [
      {
        code: "DIY_SELF_HELP",
        severity: "blocker",
        message: "DIY / self-help section required where applicable",
      },
    ];
  }
  return [];
}
