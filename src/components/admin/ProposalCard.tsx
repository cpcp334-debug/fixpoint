"use client";

import { useState } from "react";
import type { ProposalCard } from "@/lib/cofounder/proposals";

function isFinance(actionType: string) {
  return actionType === "CREATE_DRAFT_QUOTE" || actionType === "CREATE_DRAFT_INVOICE";
}

function whatLabel(actionType: string) {
  if (actionType === "CREATE_FOLLOW_UP") return "Create follow-up task";
  if (actionType === "CREATE_DRAFT_QUOTE") return "Create DRAFT quotation";
  if (actionType === "CREATE_DRAFT_INVOICE") return "Create DRAFT invoice";
  return "Create task";
}

function itemDue(item: ProposalCard["items"][number]) {
  if (item.dueAt) return item.dueAt;
  return `${item.dueInHours} hour${item.dueInHours === 1 ? "" : "s"}`;
}

function amountNote(item: ProposalCard["items"][number] | undefined) {
  if (item?.draft?.amountsSource === "quote") return "Copied from accepted quote (stored labels only). Not calculated.";
  return "Amounts: empty — staff will enter verified prices later.";
}

export function ProposalCards({
  proposals,
  onChange,
}: {
  proposals: ProposalCard[];
  onChange: (next: ProposalCard) => void;
}) {
  if (!proposals.length) return null;
  return (
    <div className="space-y-3">
      {proposals.map((proposal) => (
        <ProposalCardView key={proposal.id} proposal={proposal} onChange={onChange} />
      ))}
    </div>
  );
}

function ProposalCardView({ proposal, onChange }: { proposal: ProposalCard; onChange: (next: ProposalCard) => void }) {
  const finance = isFinance(proposal.actionType);
  const first = proposal.items[0];
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(first?.title || proposal.title);
  const [dueInHours, setDueInHours] = useState(String(first?.dueInHours || 2));
  const [assigneeStaffId, setAssigneeStaffId] = useState(first?.assigneeStaffId || "");
  const [scope, setScope] = useState(first?.draft?.scope || "");
  const [notes, setNotes] = useState(first?.draft?.notes || "");
  const [exclusions, setExclusions] = useState(first?.draft?.exclusions || "");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const pending = proposal.status === "PENDING";

  async function post(path: string, body?: Record<string, unknown>) {
    setBusy(path);
    setError("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : "{}",
      });
      const json = (await res.json()) as { ok?: boolean; proposal?: ProposalCard; error?: string; denied?: boolean };
      if (!res.ok || !json.proposal) {
        setError(json.error || "error");
        return;
      }
      onChange(json.proposal);
      setEditing(false);
    } catch {
      setError("network");
    } finally {
      setBusy("");
    }
  }

  return (
    <article className="rounded-md border border-line bg-white p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium">{proposal.title}</p>
        <span className="rounded-full bg-sand px-2 py-0.5 text-xs uppercase tracking-wide">{proposal.status}</span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase text-muted">What will happen</dt>
          <dd>{whatLabel(proposal.actionType)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-muted">Why</dt>
          <dd>
            {proposal.reason || (finance ? "Draft finance record from Co-Founder." : "Operational follow-up from Co-Founder.")}
            {proposal.sopCode || proposal.sopTitle ? (
              <span className="mt-1 block text-xs text-muted">
                {proposal.sopTitle ? `SOP: ${proposal.sopTitle}` : ""}
                {proposal.sopCode ? ` · SOP Code: ${proposal.sopCode}` : ""}
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-muted">Affected records</dt>
          <dd>
            {proposal.items.map((item) => (
              <p key={`${item.subjectType}-${item.subjectId}`}>
                {item.subjectType}: {item.subjectLabel || item.subjectId}
              </p>
            ))}
          </dd>
        </div>
        {finance ? (
          <>
            {first?.draft?.scope ? (
              <div>
                <dt className="text-xs font-medium uppercase text-muted">Scope</dt>
                <dd>{first.draft.scope}</dd>
              </div>
            ) : null}
            {first?.draft?.lines?.length ? (
              <div>
                <dt className="text-xs font-medium uppercase text-muted">Line items</dt>
                <dd>
                  {first.draft.lines.map((line, index) => (
                    <p key={`${line.description}-${index}`}>
                      {line.description}
                      {line.quantity ? ` · qty ${line.quantity}` : ""}
                      {line.unit ? ` ${line.unit}` : ""}
                    </p>
                  ))}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-medium uppercase text-muted">Amounts</dt>
              <dd>{amountNote(first)}</dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt className="text-xs font-medium uppercase text-muted">Assignee</dt>
              <dd>{first?.assigneeStaffId || "Unassigned if none eligible"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-muted">Due time</dt>
              <dd>{first ? itemDue(first) : "—"}</dd>
            </div>
          </>
        )}
        <div>
          <dt className="text-xs font-medium uppercase text-muted">Side effects</dt>
          <dd>{proposal.sideEffects}</dd>
        </div>
        <div className="text-xs text-muted">
          Creator {proposal.creator}
          {proposal.approvedBy ? ` · Approver ${proposal.approvedBy}` : ""}
          {proposal.createdAt ? ` · ${proposal.createdAt.slice(0, 16).replace("T", " ")}` : ""}
        </div>
      </dl>
      {editing && pending ? (
        <div className="mt-3 grid gap-2">
          <label className="text-xs">
            Title
            <input className="mt-1 w-full rounded-md border border-line px-2 py-1" value={title} onChange={(event) => setTitle(event.target.value.slice(0, 160))} />
          </label>
          {finance ? (
            <>
              <label className="text-xs">
                Scope
                <textarea className="mt-1 w-full rounded-md border border-line px-2 py-1" rows={3} value={scope} onChange={(event) => setScope(event.target.value.slice(0, 2000))} />
              </label>
              <label className="text-xs">
                Notes
                <textarea className="mt-1 w-full rounded-md border border-line px-2 py-1" rows={2} value={notes} onChange={(event) => setNotes(event.target.value.slice(0, 1000))} />
              </label>
              <label className="text-xs">
                Exclusions
                <textarea className="mt-1 w-full rounded-md border border-line px-2 py-1" rows={2} value={exclusions} onChange={(event) => setExclusions(event.target.value.slice(0, 1000))} />
              </label>
            </>
          ) : (
            <>
              <label className="text-xs">
                Due (hours)
                <input className="mt-1 w-full rounded-md border border-line px-2 py-1" type="number" min={1} max={720} value={dueInHours} onChange={(event) => setDueInHours(event.target.value)} />
              </label>
              <label className="text-xs">
                Assignee staff id
                <input className="mt-1 w-full rounded-md border border-line px-2 py-1" value={assigneeStaffId} onChange={(event) => setAssigneeStaffId(event.target.value)} />
              </label>
            </>
          )}
          <button
            type="button"
            className="rounded-md bg-navy px-3 py-1.5 text-white"
            disabled={Boolean(busy)}
            onClick={() =>
              void post(`/api/admin/ai/proposals/${proposal.id}/edit`, finance
                ? { title, scope, notes, exclusions }
                : {
                    title,
                    dueInHours: Number(dueInHours),
                    assigneeStaffId: assigneeStaffId || null,
                  })
            }
          >
            Save edits
          </button>
        </div>
      ) : null}
      {pending && !editing ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="rounded-md bg-navy px-3 py-1.5 text-white" disabled={Boolean(busy)} onClick={() => void post(`/api/admin/ai/proposals/${proposal.id}/approve`)}>
            Approve
          </button>
          <button type="button" className="rounded-md border border-line px-3 py-1.5" disabled={Boolean(busy)} onClick={() => setEditing(true)}>
            Edit
          </button>
          <button type="button" className="rounded-md border border-line px-3 py-1.5" disabled={Boolean(busy)} onClick={() => void post(`/api/admin/ai/proposals/${proposal.id}/cancel`)}>
            Cancel
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </article>
  );
}
