import { needSession } from "@/lib/admin/guard";
import { isOpenAiConfigured } from "@/lib/ai/env";
import { canUseCoFounder } from "@/lib/cofounder/rbac";
import { getPriorityActions } from "@/lib/cofounder/priority";
import { getCofounderDailyUsage } from "@/lib/cofounder/limits";
import { Forbidden, PageHeader } from "@/components/admin/Ui";
import { CoFounderChat } from "@/components/admin/CoFounderChat";

export const metadata = {
  title: "AI Co-Founder | Admin",
  robots: { index: false, follow: false },
};

export default async function AdminAiPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await needSession();
  if (!canUseCoFounder(session.role)) return <Forbidden />;
  const query = await searchParams;
  const [priorityActions, usage] = await Promise.all([getPriorityActions(session, 8), getCofounderDailyUsage(session.id)]);
  return (
    <div>
      <PageHeader
        title="ALNAJAH AI Co-Founder"
        note="Internal staff assistant. Read tools inherit your role. Task and draft finance ideas are pending proposals — Approve, Edit, or Cancel. Approved finance proposals create DRAFT records only. It cannot send quotes, issue invoices, confirm bookings, invent prices, or edit automation."
      />
      <CoFounderChat
        initialPrompt={query.q || ""}
        role={session.role}
        priorityActions={priorityActions}
        usage={{ used: usage.used, limit: usage.limit, remaining: usage.remaining, timezone: usage.timezone }}
        modelConfigured={isOpenAiConfigured()}
      />
    </div>
  );
}
