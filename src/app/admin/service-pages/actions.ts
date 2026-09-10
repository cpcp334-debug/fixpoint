"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireStaff } from "@/lib/admin/auth";
import { str } from "@/lib/admin/forms";
import { applyBulkCoverage, applyCoverageDecision, previewBulkCoverage } from "@/lib/service-location/coverage-ops";
import {
  buildPilotCandidateQueue,
  promoteLifecycleStep,
  publishServiceLocation,
} from "@/lib/service-location/publication-ops";
import type { CoverageDecision } from "@/lib/service-location/publication-eligibility";
import type { ServiceLocationLifecycle } from "@prisma/client";

function deny(): never {
  redirect("/login");
}

async function actorServices() {
  const auth = await requireStaff("services");
  if (!auth.session) deny();
  if (!auth.ok) redirect("/admin");
  return auth.session;
}

export async function previewBulkCoverageAction(formData: FormData) {
  await actorServices();
  const serviceIds = formData.getAll("serviceIds").map(String).filter(Boolean);
  const locationIds = formData.getAll("locationIds").map(String).filter(Boolean);
  const setCovered = String(formData.get("setCovered") || "") === "true";
  if (!serviceIds.length || !locationIds.length) {
    redirect("/admin/service-pages/coverage?error=select");
  }
  const preview = await previewBulkCoverage(prisma, { serviceIds, locationIds, setCovered });
  const q = new URLSearchParams({
    preview: "1",
    services: String(preview.serviceCount),
    locations: String(preview.locationCount),
    rows: String(preview.rowCount),
    beforeCovered: String(preview.beforeCovered),
    beforeUncovered: String(preview.beforeUncovered),
    afterCovered: String(preview.afterCovered),
    afterUncovered: String(preview.afterUncovered),
    protected: String(preview.protectedPublishedSkipped),
    setCovered: setCovered ? "true" : "false",
    serviceIds: serviceIds.join(","),
    locationIds: locationIds.join(","),
  });
  redirect(`/admin/service-pages/coverage?${q.toString()}`);
}

export async function applyBulkCoverageAction(formData: FormData) {
  const session = await actorServices();
  const rawServices = String(formData.get("serviceIds") || "");
  const rawLocations = String(formData.get("locationIds") || "");
  const serviceIds = rawServices.includes(",")
    ? rawServices.split(",").map((s) => s.trim()).filter(Boolean)
    : formData.getAll("serviceIds").map(String).filter(Boolean);
  const locationIds = rawLocations.includes(",")
    ? rawLocations.split(",").map((s) => s.trim()).filter(Boolean)
    : formData.getAll("locationIds").map(String).filter(Boolean);
  const setCovered = String(formData.get("setCovered") || "") === "true";
  const expectedRowCount = Number(formData.get("expectedRowCount") || "0");
  const confirmToken = String(formData.get("confirmToken") || "");
  const reason = str(formData, "reason") || "bulk_coverage";
  try {
    await applyBulkCoverage(prisma, {
      serviceIds,
      locationIds,
      setCovered,
      actor: session.email,
      reason,
      confirmToken,
      expectedRowCount,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    redirect(`/admin/service-pages/coverage?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/admin/service-pages");
  revalidatePath("/admin/service-pages/coverage");
  redirect("/admin/service-pages/coverage?ok=bulk");
}

export async function setCoverageDecisionAction(formData: FormData) {
  const session = await actorServices();
  const id = str(formData, "id");
  const decision = str(formData, "decision") as CoverageDecision;
  const reason = str(formData, "reason") || "manual_coverage";
  if (!["COVERED", "NOT_COVERED", "TEMPORARILY_CLOSED"].includes(decision)) {
    redirect(`/admin/service-pages/${id}?error=decision`);
  }
  try {
    await applyCoverageDecision(prisma, {
      serviceLocationId: id,
      decision,
      actor: session.email,
      reason,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    redirect(`/admin/service-pages/${id}?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath(`/admin/service-pages/${id}`);
  revalidatePath("/admin/service-pages");
  redirect(`/admin/service-pages/${id}?ok=coverage`);
}

export async function promoteLifecycleAction(formData: FormData) {
  const session = await actorServices();
  const id = str(formData, "id");
  const to = str(formData, "to") as ServiceLocationLifecycle;
  const reason = str(formData, "reason") || "lifecycle_promote";
  try {
    await promoteLifecycleStep(prisma, {
      serviceLocationId: id,
      to,
      actor: session.email,
      reason,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    redirect(`/admin/service-pages/${id}?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath(`/admin/service-pages/${id}`);
  redirect(`/admin/service-pages/${id}?ok=promote`);
}

export async function publishServiceLocationAction(formData: FormData) {
  const session = await actorServices();
  const id = str(formData, "id");
  const reason = str(formData, "reason") || "controlled_publish";
  const confirmToken = String(formData.get("confirmToken") || "");
  const publishAr = String(formData.get("publishAr") || "") === "true";
  try {
    await publishServiceLocation(prisma, {
      serviceLocationId: id,
      actor: session.email,
      reason,
      confirmToken,
      publishAr,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    redirect(`/admin/service-pages/${id}?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath(`/admin/service-pages/${id}`);
  revalidatePath("/admin/service-pages");
  revalidatePath("/admin/service-pages/queue");
  redirect(`/admin/service-pages/${id}?ok=published`);
}

export async function refreshPilotQueueAction() {
  const session = await actorServices();
  const pilot = await buildPilotCandidateQueue(prisma, 50);
  const existing = await prisma.siteSetting.findUnique({ where: { id: "site" } });
  let base: Record<string, unknown> = {};
  try {
    base = JSON.parse(existing?.json || "{}") as Record<string, unknown>;
  } catch {
    base = {};
  }
  base.publicationPilotQueue = pilot;
  base.publicationPilotUpdatedBy = session.email;
  base.publicationPilotUpdatedAt = new Date().toISOString();
  await prisma.siteSetting.upsert({
    where: { id: "site" },
    create: { id: "site", json: JSON.stringify(base) },
    update: { json: JSON.stringify(base) },
  });
  revalidatePath("/admin/service-pages/queue");
  redirect("/admin/service-pages/queue?ok=pilot");
}
