"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { voteGuide } from "@/server/votes";
import { Button } from "@/components/ui/Button";

export function VoteButtons({ guideId }: { guideId: string }) {
  const t = useTranslations("Diy");
  const [done, setDone] = useState(false);

  async function vote(helpful: boolean) {
    const result = await voteGuide(guideId, helpful);
    if (result.ok) setDone(true);
  }

  if (done) {
    return <p className="text-sm text-muted">{t("voteThanks")}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm font-medium text-navy">{t("helpful")}</p>
      <Button type="button" variant="secondary" onClick={() => void vote(true)}>
        {t("yes")}
      </Button>
      <Button type="button" variant="secondary" onClick={() => void vote(false)}>
        {t("no")}
      </Button>
    </div>
  );
}
