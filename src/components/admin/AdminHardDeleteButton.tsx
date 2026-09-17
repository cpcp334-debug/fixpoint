"use client";

import { hardDeleteAction } from "@/app/admin/hard-delete-actions";
import type { BulkEntity } from "@/app/admin/bulk-actions";

/** Super-admin permanent delete with typed DELETE confirm. */
export function AdminHardDeleteButton({
  entity,
  id,
  returnTo,
  label = "Delete forever",
}: {
  entity: BulkEntity;
  id: string;
  returnTo: string;
  label?: string;
}) {
  return (
    <form
      action={hardDeleteAction}
      className="inline"
      onSubmit={(event) => {
        const ok = window.confirm(
          "Permanent delete cannot be undone. Soft-remove (archive) is safer for most cases.\n\nContinue only if you typed DELETE in the confirm field.",
        );
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <label className="sr-only" htmlFor={`del-confirm-${id}`}>
        Type DELETE to confirm
      </label>
      <input
        id={`del-confirm-${id}`}
        name="confirm"
        placeholder="Type DELETE"
        className="me-1 w-24 rounded border border-line px-1 py-0.5 text-xs"
        autoComplete="off"
      />
      <button type="submit" className="text-xs text-danger underline-offset-2 hover:underline">
        {label}
      </button>
    </form>
  );
}
