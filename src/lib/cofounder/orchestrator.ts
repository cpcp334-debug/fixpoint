import { prisma } from "@/server/db";
import type { StaffSession } from "@/lib/admin/auth";
import { appendStaffMessages, clipUserMessage, createStaffConversation, loadStaffConversation } from "@/lib/cofounder/conversations";
import { cofounderFailsafeReply } from "@/lib/cofounder/failsafe";
import { auditMetaForTool } from "@/lib/cofounder/privacy";
import { toolsForSession } from "@/lib/cofounder/rbac";
import { openaiToolSpecs } from "@/lib/cofounder/specs";
import { executeCofounderTool } from "@/lib/cofounder/tools";
import { COFOUNDER_TIMEOUT_MS, type CofounderMessage, type CofounderSession } from "@/lib/cofounder/types";
import type { ProposalCard } from "@/lib/cofounder/proposals";
import { toolResultCards, type ToolResultCard } from "@/lib/cofounder/result-cards";

const SYSTEM = `You are ALNAJAH AI Co-Founder, an internal staff assistant for Al Najah Al Daem · Fixpoint.
Use only the provided tools. Never invent metrics, prices, wait times, licenses, counts, names, due dates, staff availability, or operational status.
If a tool is denied, say the role cannot access that data.
Never confirm bookings, change prices, create live quotes, invoices, work orders, refunds, or automation rules.
Never create tasks, follow-ups, quotes, or invoices directly. To recommend a task, call propose_follow_up or propose_task. To recommend a draft quotation or invoice, call propose_draft_quote or propose_draft_invoice. Those tools only create a PENDING proposal. Staff must Approve, Edit, or Cancel.
When asked what to focus on, call get_priority_actions and/or get_daily_brief. Use only returned counts.
Never invent prices, labor amounts, material amounts, discounts, tax, or totals. Leave money fields empty unless copying stored labels from an accepted quote.
Never approve or reject reviews. Never access PRIVATE knowledge documents.
For procedures, use get_sop or search_internal_sop. Quote only returned SOP text.
If no SOP is returned, say exactly: SOP not available.
If the SOP is incomplete for the case, say: Current SOP does not cover this case.
Do not invent company policy. Do not ask for passports, Emirates ID, passwords, or private upload files.
When you use an SOP, name it as SOP: [title] and SOP Code: [sopCode]. You may cite it as the reason for a pending task proposal.
Reply in concise English.`;

export type CofounderChatResult = {
  reply: string;
  conversationId: string;
  provider: "openai" | "failsafe";
  toolsUsed: string[];
  sources: CofounderSource[];
  proposals: ProposalCard[];
  cards: ToolResultCard[];
  unavailable?: boolean;
};

export type CofounderSource = {
  type: "sop";
  title: string;
  sopCode: string;
  version?: number;
  updatedAt?: string;
};

type OaiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: unknown;
};

function asSession(staff: StaffSession, frozenRole: string, conversationId?: string): CofounderSession {
  return { id: staff.id, email: staff.email, role: staff.role, staffId: staff.staffId, frozenRole, conversationId };
}

function collectCards(tool: string, result: { ok: boolean; data?: unknown }, into: ToolResultCard[]) {
  if (!result.ok || result.data === undefined) return;
  for (const card of toolResultCards(tool, result.data)) {
    if (into.some((item) => item.id === card.id && item.tool === card.tool)) continue;
    into.push(card);
  }
}

function collectSopSources(result: { ok: boolean; data?: unknown }, into: CofounderSource[]) {
  if (!result.ok || !result.data || typeof result.data !== "object") return;
  const data = result.data as Record<string, unknown>;
  const push = (row: Record<string, unknown>) => {
    const title = typeof row.title === "string" ? row.title : "";
    const sopCode = typeof row.sopCode === "string" ? row.sopCode : "";
    if (!title && !sopCode) return;
    if (into.some((item) => item.sopCode === sopCode && item.title === title)) return;
    into.push({
      type: "sop",
      title,
      sopCode,
      version: typeof row.version === "number" ? row.version : undefined,
      updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : undefined,
    });
  };
  if (data.title || data.sopCode) push(data);
  if (Array.isArray(data.results)) {
    for (const row of data.results) {
      if (row && typeof row === "object") push(row as Record<string, unknown>);
    }
  }
}

function collectProposals(result: { ok: boolean; data?: unknown }, into: ProposalCard[]) {
  if (!result.ok || !result.data || typeof result.data !== "object") return;
  const data = result.data as Record<string, unknown>;
  const push = (row: unknown) => {
    if (!row || typeof row !== "object") return;
    const card = row as ProposalCard;
    if (!card.id || !card.status) return;
    if (into.some((item) => item.id === card.id)) return;
    into.push(card);
  };
  if (data.proposal) push(data.proposal);
  if (Array.isArray(data.proposals)) {
    for (const row of data.proposals) push(row);
  }
}

async function auditTool(actor: string, tool: string, entityId: string, result: { ok: boolean; denied?: boolean; error?: string }) {
  await prisma.auditLog
    .create({
      data: {
        actor,
        action: "cofounder.tool",
        entity: tool,
        entityId,
        meta: auditMetaForTool(tool, result),
      },
    })
    .catch(() => undefined);
}

export async function runCofounder(opts: {
  staff: StaffSession;
  message: string;
  conversationId?: string;
}): Promise<CofounderChatResult> {
  const text = clipUserMessage(opts.message);
  if (!text) {
    return { reply: "Enter a question.", conversationId: opts.conversationId || "", provider: "failsafe", toolsUsed: [], sources: [], proposals: [], cards: [], unavailable: false };
  }

  let conversationId = opts.conversationId;
  let frozenRole = opts.staff.role;
  if (conversationId) {
    const existing = await loadStaffConversation(conversationId, opts.staff.id);
    if (!existing) return { reply: "Conversation not found.", conversationId: "", provider: "failsafe", toolsUsed: [], sources: [], proposals: [], cards: [], unavailable: false };
    frozenRole = existing.frozenRole;
  } else {
    const created = await createStaffConversation(opts.staff.id, opts.staff.role);
    conversationId = created.id;
    frozenRole = created.frozenRole;
  }

  const session = asSession(opts.staff, frozenRole, conversationId);
  const history = (await loadStaffConversation(conversationId, opts.staff.id))?.messages || [];
  const userMsg: CofounderMessage = { role: "user", content: text };
  await prisma.auditLog
    .create({
      data: {
        actor: opts.staff.email,
        action: "cofounder.chat",
        entity: "StaffAiConversation",
        entityId: conversationId,
        meta: JSON.stringify({ chars: text.length, role: frozenRole }),
      },
    })
    .catch(() => undefined);

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const reply = cofounderFailsafeReply();
    await appendStaffMessages(conversationId, opts.staff.id, [userMsg, { role: "assistant", content: reply }]);
    return { reply, conversationId, provider: "failsafe", toolsUsed: [], sources: [], proposals: [], cards: [], unavailable: true };
  }

  const toolsUsed: string[] = [];
  const sources: CofounderSource[] = [];
  const proposals: ProposalCard[] = [];
  const cards: ToolResultCard[] = [];
  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: key, timeout: COFOUNDER_TIMEOUT_MS });
    const model = process.env.COFOUNDER_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
    const allowed = toolsForSession(session.role, session.frozenRole);
    const specs = openaiToolSpecs(allowed);
    const openaiMessages: OaiMessage[] = [
      { role: "system", content: `${SYSTEM}\nFrozen role: ${frozenRole}. Session role: ${opts.staff.role}.` },
    ];
    for (const row of history) {
      if (row.role === "tool") continue;
      openaiMessages.push({ role: row.role, content: row.content });
    }
    openaiMessages.push({ role: "user", content: text });

    let reply = cofounderFailsafeReply();
    let provider: "openai" | "failsafe" = "failsafe";
    for (let round = 0; round < 4; round += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), COFOUNDER_TIMEOUT_MS);
      try {
        const response = await client.chat.completions.create(
          {
            model,
            temperature: 0,
            messages: openaiMessages as never,
            tools: specs.length ? specs : undefined,
            tool_choice: specs.length ? "auto" : "none",
          },
          { signal: controller.signal },
        );
        const choice = response.choices[0]?.message;
        const calls = choice?.tool_calls || [];
        if (calls.length) {
          openaiMessages.push({
            role: "assistant",
            content: choice?.content || null,
            tool_calls: calls,
          });
          for (const call of calls) {
            const fn = "function" in call ? call.function : undefined;
            const name = fn?.name || "";
            let args: Record<string, unknown> = {};
            try {
              args = fn?.arguments ? (JSON.parse(fn.arguments) as Record<string, unknown>) : {};
            } catch {
              args = {};
            }
            toolsUsed.push(name);
            const result = await executeCofounderTool(session, name, args);
            collectSopSources(result, sources);
            collectProposals(result, proposals);
            collectCards(name, result, cards);
            await auditTool(opts.staff.email, name, String(args.sopCode || args.id || conversationId), result);
            openaiMessages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(result).slice(0, name.includes("sop") ? 8000 : 4000),
            });
          }
          continue;
        }
        reply = (choice?.content || "").trim() || cofounderFailsafeReply();
        provider = "openai";
        break;
      } finally {
        clearTimeout(timer);
      }
    }
    await appendStaffMessages(conversationId, opts.staff.id, [userMsg, { role: "assistant", content: reply }]);
    return { reply, conversationId, provider, toolsUsed, sources, proposals, cards, unavailable: provider === "failsafe" };
  } catch {
    const reply = cofounderFailsafeReply();
    await appendStaffMessages(conversationId, opts.staff.id, [userMsg, { role: "assistant", content: reply }]);
    return { reply, conversationId, provider: "failsafe", toolsUsed: [], sources, proposals: [], cards, unavailable: true };
  }
}
