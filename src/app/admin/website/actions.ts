"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";
import { adminAudit } from "@/lib/admin/numbers";
import { str } from "@/lib/admin/forms";
import { SITE_SHELL_SECTIONS, upsertSiteShellDraft, type SiteShellSection } from "@/lib/site-shell";

function isSection(value: string): value is SiteShellSection {
  return (SITE_SHELL_SECTIONS as readonly string[]).includes(value);
}

export async function saveSiteShellAction(formData: FormData) {
  const auth = await requireStaff("diy");
  if (!auth.session) redirect("/login");
  if (!auth.ok) redirect("/admin");

  const section = str(formData, "section");
  if (!isSection(section)) redirect("/admin/website?error=bad_section");

  const publish = str(formData, "intent") === "publish";
  const payloadEn = String(formData.get("payloadEn") || "{}");
  const payloadAr = String(formData.get("payloadAr") || "{}");

  try {
    JSON.parse(payloadEn);
    JSON.parse(payloadAr);
  } catch {
    redirect(`/admin/website/${section}?error=bad_json`);
  }

  await upsertSiteShellDraft({
    section,
    payloadEn,
    payloadAr,
    updatedBy: auth.session.email,
    publish,
  });

  await adminAudit({
    actor: auth.session.email,
    action: publish ? "site_shell.publish" : "site_shell.save",
    entity: "SiteShellDocument",
    entityId: section,
  });

  revalidatePath("/");
  revalidatePath("/en");
  revalidatePath("/ar");
  revalidatePath("/admin/website");
  revalidatePath(`/admin/website/${section}`);

  redirect(`/admin/website/${section}?ok=${publish ? "site_published" : "site_saved"}`);
}
