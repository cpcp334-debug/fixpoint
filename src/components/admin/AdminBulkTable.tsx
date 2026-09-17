"use client";

import { useMemo, useState, type ReactNode } from "react";
import { bulkManageAction } from "@/app/admin/bulk-actions";
import type { BulkAction, BulkEntity } from "@/app/admin/bulk-actions";

export type AdminBulkRow = {
  id: string;
  cells: ReactNode[];
};

const ACTION_LABELS: Record<BulkAction, string> = {
  publish: "Publish",
  hide: "Hide",
  archive: "Soft-remove",
};

export function AdminBulkTable({
  entity,
  returnTo,
  headers,
  rows,
  actions = ["publish", "hide", "archive"],
  actionLabels,
  emptyNote,
}: {
  entity: BulkEntity;
  returnTo: string;
  headers: string[];
  rows: AdminBulkRow[];
  actions?: BulkAction[];
  actionLabels?: Partial<Record<BulkAction, string>>;
  emptyNote?: string;
}) {
  const ids = useMemo(() => rows.map((row) => row.id), [rows]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (ids.length > 0 && ids.every((id) => prev.has(id))) return new Set();
      return new Set(ids);
    });
  }

  const selectedIds = ids.filter((id) => selected.has(id));

  return (
    <div className="space-y-3">
      {someSelected ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-navy/30 bg-navy/5 px-3 py-2 text-sm">
          <span className="font-medium">{selectedIds.length} selected</span>
          {actions.map((action) => (
            <form key={action} action={bulkManageAction} className="inline">
              <input type="hidden" name="entity" value={entity} />
              <input type="hidden" name="action" value={action} />
              <input type="hidden" name="returnTo" value={returnTo} />
              {selectedIds.map((id) => (
                <input key={id} type="hidden" name="ids" value={id} />
              ))}
              <button
                type="submit"
                className={
                  action === "archive"
                    ? "rounded-md border border-line bg-white px-3 py-1.5 text-danger"
                    : "rounded-md border border-line bg-white px-3 py-1.5 text-navy"
                }
              >
                {actionLabels?.[action] || ACTION_LABELS[action]}
              </button>
            </form>
          ))}
          <button type="button" className="text-muted underline" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-sand-2 text-muted">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  aria-label="Select all visible rows"
                  checked={allSelected}
                  disabled={!ids.length}
                  onChange={toggleAll}
                />
              </th>
              {headers.map((header) => (
                <th key={header || "actions"} className="px-3 py-2 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-3 py-2 align-top">
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.id}`}
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                  />
                </td>
                {row.cells.map((cell, index) => (
                  <td key={index} className="px-3 py-2 align-top">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? <p className="text-sm text-muted">{emptyNote || "No rows match."}</p> : null}
    </div>
  );
}
