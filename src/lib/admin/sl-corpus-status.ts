import { existsSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/server/db";

const LOG_REL = join("logs", "overnight-sl-corpus.log");
const STALL_MS = 60 * 60 * 1000;
const ACTIVE_MS = 15 * 60 * 1000;

export type SlCorpusJobHealth = "running" | "idle" | "stalled" | "unknown";

export type SlCorpusDashboardStatus = {
  total: number;
  published: number;
  draft: number;
  draftWithEnContent: number;
  pctPublished: number;
  jobHealth: SlCorpusJobHealth;
  jobLabel: string;
  logLastWriteAt: string | null;
  logLastPublishedTotal: number | null;
  servicePagesHref: string;
};

export function canViewSlCorpusOps(role: string) {
  return role === "super_admin" || role === "admin" || role === "manager";
}

function readOvernightLogHealth(cwd = process.cwd()): {
  jobHealth: SlCorpusJobHealth;
  jobLabel: string;
  logLastWriteAt: string | null;
  logLastPublishedTotal: number | null;
} {
  const logPath = join(cwd, LOG_REL);
  if (!existsSync(logPath)) {
    return {
      jobHealth: "unknown",
      jobLabel: "No overnight log yet",
      logLastWriteAt: null,
      logLastPublishedTotal: null,
    };
  }

  const st = statSync(logPath);
  const ageMs = Date.now() - st.mtimeMs;
  const logLastWriteAt = st.mtime.toISOString();

  let tail = "";
  try {
    const buf = readFileSync(logPath, { encoding: "utf8" });
    tail = buf.slice(Math.max(0, buf.length - 12000));
  } catch {
    tail = "";
  }

  const publishedMatches = [...tail.matchAll(/"publishedTotal":\s*(\d+)/g)];
  const logLastPublishedTotal = publishedMatches.length
    ? Number(publishedMatches[publishedMatches.length - 1]![1])
    : null;

  const exited = /Exit=\d+/.test(tail);
  const stopped = /"phase":\s*"stop_on_stall"/.test(tail) || /"phase":\s*"done"/.test(tail);

  if (exited || stopped) {
    if (ageMs > STALL_MS) {
      return {
        jobHealth: "stalled",
        jobLabel: "Overnight job stopped — resume needed",
        logLastWriteAt,
        logLastPublishedTotal,
      };
    }
    return {
      jobHealth: "idle",
      jobLabel: "Overnight job finished or stopped recently",
      logLastWriteAt,
      logLastPublishedTotal,
    };
  }

  if (ageMs <= ACTIVE_MS) {
    return {
      jobHealth: "running",
      jobLabel: "Overnight log updating (likely running)",
      logLastWriteAt,
      logLastPublishedTotal,
    };
  }
  if (ageMs <= STALL_MS) {
    return {
      jobHealth: "idle",
      jobLabel: "Overnight log quiet (may be between batches)",
      logLastWriteAt,
      logLastPublishedTotal,
    };
  }
  return {
    jobHealth: "stalled",
    jobLabel: "Overnight log idle too long — likely stalled",
    logLastWriteAt,
    logLastPublishedTotal,
  };
}

export async function getSlCorpusDashboardStatus(): Promise<SlCorpusDashboardStatus> {
  const [total, published, draft, draftWithEnContent] = await Promise.all([
    prisma.serviceLocation.count(),
    prisma.serviceLocation.count({
      where: { coverageStatus: "published", covered: true, indexable: true },
    }),
    prisma.serviceLocation.count({ where: { coverageStatus: { not: "published" } } }),
    prisma.serviceLocation.count({
      where: {
        coverageStatus: { not: "published" },
        translations: { some: { locale: "en", h1: { not: "" }, intro: { not: "" } } },
      },
    }),
  ]);

  const log = readOvernightLogHealth();
  const pctPublished = total > 0 ? Math.round((published / total) * 1000) / 10 : 0;

  return {
    total,
    published,
    draft,
    draftWithEnContent,
    pctPublished,
    ...log,
    servicePagesHref: "/admin/service-pages",
  };
}
