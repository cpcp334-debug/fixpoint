export function AdminFlash({ ok, error }: { ok?: string; error?: string; n?: string }) {
  if (!ok && !error) return null;
  if (error) {
    const decoded = decodeURIComponent(error);
    const message =
      error === "bulk_empty"
        ? "Select at least one row."
        : error === "bulk_last_super"
          ? "Cannot deactivate the only active super admin."
          : error === "bulk_forbidden"
            ? "You do not have permission for that bulk action."
            : error === "bulk_partial"
              ? "Some rows were skipped (eligibility or safety rules)."
              : error === "delete_forbidden"
                ? "Permanent delete is only for super admin, or this entity cannot be deleted."
                : error === "delete_confirm"
                  ? "Type DELETE exactly in the confirm field to permanently delete."
                  : error === "delete_has_sl"
                    ? "Cannot delete: service×location rows still reference this record. Soft-remove instead."
                    : error === "delete_has_children"
                      ? "Cannot delete: child locations exist. Soft-remove or reparent first."
                      : error === "delete_master_place"
                        ? "Country and emirate masters cannot be permanently deleted."
                        : error === "not_found"
                          ? "Record not found."
                          : decoded.startsWith("mail_")
                            ? `Staff email failed: ${decoded.slice(5) || "unknown"}`
                            : decoded;
    return <p className="mb-4 rounded-md border border-line bg-white px-3 py-2 text-sm text-danger">{message}</p>;
  }
  const label =
    ok === "bulk_publish"
      ? "Published selected rows."
      : ok === "bulk_hide"
        ? "Hid selected rows."
        : ok === "bulk_archive"
          ? "Soft-removed / archived selected rows."
          : ok === "bulk_ok"
            ? "Bulk update saved."
            : ok === "hard_deleted"
              ? "Permanently deleted."
              : ok === "site_saved"
                ? "Website content saved."
                : ok === "site_published"
                  ? "Website content published."
                  : ok === "mail_sent"
                    ? "Test staff email sent. Check inbox and Resend → Emails."
                    : "Saved.";
  return <p className="mb-4 rounded-md border border-line bg-white px-3 py-2 text-sm text-accent">{label}</p>;
}
