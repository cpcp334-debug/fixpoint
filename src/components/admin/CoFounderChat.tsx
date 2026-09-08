"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProposalCards } from "@/components/admin/ProposalCard";
import { PriorityActionsPanel, SopSourceList, ToolResultCards } from "@/components/admin/CofounderPanels";
import type { ProposalCard } from "@/lib/cofounder/proposals";
import type { PriorityAction } from "@/lib/cofounder/priority";
import type { ToolResultCard } from "@/lib/cofounder/result-cards";
import { suggestedPromptsForRole } from "@/lib/cofounder/prompts";

type SopSource = { type?: string; title?: string; sopCode?: string; version?: number; updatedAt?: string };
type Msg = {
  role: "user" | "assistant";
  content: string;
  sources?: SopSource[];
  proposals?: ProposalCard[];
  cards?: ToolResultCard[];
  unavailable?: boolean;
};

export function CoFounderChat({
  initialPrompt = "",
  initialProposals = [],
  role = "manager",
  priorityActions = [],
  usage,
  modelConfigured = true,
}: {
  initialPrompt?: string;
  initialProposals?: ProposalCard[];
  role?: string;
  priorityActions?: PriorityAction[];
  usage?: { used: number; limit: number; remaining: number; timezone: string };
  modelConfigured?: boolean;
}) {
  const suggested = useMemo(() => suggestedPromptsForRole(role), [role]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState(initialPrompt);
  const [pending, setPending] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(!modelConfigured);
  const [usageState, setUsageState] = useState(usage);
  const [proposals, setProposals] = useState<ProposalCard[]>(initialProposals);
  const placeholder = useMemo(() => "Ask about today's brief, priorities, or a specific record…", []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/ai/proposals");
        const json = (await res.json()) as { proposals?: ProposalCard[] };
        if (!cancelled && res.ok && Array.isArray(json.proposals)) setProposals(json.proposals);
      } catch {
        /* history is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function upsertProposal(next: ProposalCard) {
    setProposals((prev) => {
      const others = prev.filter((row) => row.id !== next.id);
      return [next, ...others];
    });
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    setPending(true);
    setError("");
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    try {
      const res = await fetch("/api/admin/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, conversationId: conversationId || undefined }),
      });
      const json = (await res.json()) as {
        reply?: string;
        conversationId?: string;
        error?: string;
        message?: string;
        unavailable?: boolean;
        sources?: SopSource[];
        proposals?: ProposalCard[];
        cards?: ToolResultCard[];
        provider?: string;
        usage?: { used: number; limit: number; remaining: number; timezone: string };
      };
      if (json.usage) setUsageState(json.usage);
      if (!res.ok) {
        const label =
          json.error === "dailyLimit"
            ? json.message || "Daily limit reached."
            : json.error === "rateLimit"
              ? json.message || "Rate limit reached."
              : json.error || "error";
        setError(label);
        setUnavailable(Boolean(json.unavailable) || json.error === "dailyLimit" || json.error === "rateLimit");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: json.error === "dailyLimit" || json.error === "rateLimit" ? label : "Request failed. I will not invent an answer.",
            unavailable: true,
          },
        ]);
        return;
      }
      if (json.conversationId) setConversationId(json.conversationId);
      const created = json.proposals || [];
      created.forEach(upsertProposal);
      const isUnavailable = Boolean(json.unavailable) || json.provider === "failsafe";
      if (isUnavailable) setUnavailable(true);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: json.reply || "",
          sources: json.sources,
          proposals: created,
          cards: json.cards || [],
          unavailable: isUnavailable,
        },
      ]);
    } catch {
      setError("network");
      setUnavailable(true);
      setMessages((prev) => [...prev, { role: "assistant", content: "Network error. I will not invent an answer.", unavailable: true }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        {unavailable ? (
          <p className="rounded-md border border-line bg-sand-2 px-3 py-2 text-xs text-muted" role="status">
            Co-Founder is unavailable or limited right now. Open Leads, Bookings, Tasks, or Analytics for live figures — answers are never invented.
          </p>
        ) : null}
        <PriorityActionsPanel actions={priorityActions} title="Priority actions for your role" />
        <section className="rounded-md border border-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Conversation</p>
              <p className="text-xs text-muted">Proposals require Approve / Edit / Cancel. Finance drafts stay DRAFT.</p>
            </div>
            {usageState ? (
              <p className="text-[11px] text-muted">
                {usageState.used}/{usageState.limit} chats today · {usageState.timezone}
              </p>
            ) : null}
          </div>
          <div className="min-h-72 space-y-3">
            {!messages.length ? (
              <div className="rounded-md bg-sand/50 p-4 text-sm text-muted">
                <p className="font-medium text-navy">Ask a business question</p>
                <p className="mt-1">Use suggested prompts or ask about priorities. Tool results appear as compact cards. Task and draft ideas appear as proposals only.</p>
              </div>
            ) : null}
            {messages.map((row, i) => (
              <div key={`${row.role}-${i}`} className="transition-opacity duration-200">
                <p className={row.role === "user" ? "text-sm" : "rounded-md bg-sand-2 p-3 text-sm leading-relaxed"}>
                  <span className="font-medium">{row.role === "user" ? "You" : "Co-Founder"}: </span>
                  {row.content}
                </p>
                {row.cards?.length ? <ToolResultCards cards={row.cards} /> : null}
                {row.sources?.length ? <SopSourceList sources={row.sources} /> : null}
                {row.proposals?.length ? (
                  <div className="mt-2">
                    <ProposalCards proposals={row.proposals.map((item) => proposals.find((entry) => entry.id === item.id) || item)} onChange={upsertProposal} />
                  </div>
                ) : null}
              </div>
            ))}
            {pending ? (
              <p className="text-sm text-muted" aria-live="polite">
                Working…
              </p>
            ) : null}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, 2000))}
              maxLength={2000}
              className="min-h-10 flex-1 rounded-md border border-line px-3 py-2 text-sm"
              placeholder={placeholder}
              aria-label="Message Co-Founder"
            />
            <button type="submit" className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={pending}>
              Send
            </button>
          </form>
        </section>
      </div>
      <aside className="space-y-4">
        <div className="rounded-md border border-line bg-white p-4">
          <p className="text-sm font-medium">Suggested for your role</p>
          <ul className="mt-2 space-y-2">
            {suggested.map((prompt) => (
              <li key={prompt}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-navy transition-colors hover:bg-sand disabled:opacity-50"
                  onClick={() => void send(prompt)}
                  disabled={pending}
                >
                  {prompt}
                </button>
              </li>
            ))}
          </ul>
          <Link href="/admin" className="mt-3 inline-block text-xs text-muted underline-offset-2 hover:underline">
            Back to operations inbox
          </Link>
        </div>
        <div className="rounded-md border border-line bg-white p-4">
          <p className="text-sm font-medium">Proposal history</p>
          <p className="mt-1 text-xs text-muted">Pending, approved, cancelled, and failed. Human approval required.</p>
          <div className="mt-3 max-h-[32rem] space-y-3 overflow-auto">
            {proposals.length ? <ProposalCards proposals={proposals} onChange={upsertProposal} /> : <p className="text-xs text-muted">No proposals yet.</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
