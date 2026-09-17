/**
 * Build Hostinger upload zip (source only — Hostinger runs npm install/build).
 * Output: deploy/out/alnajah-aldaem-hostinger.zip
 */
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const outDir = join(root, "deploy", "out");
const zipPath = join(outDir, "alnajah-aldaem-hostinger.zip");

mkdirSync(outDir, { recursive: true });

const excludeDirs = new Set([
  "node_modules",
  ".next",
  "deploy",
  ".git",
  "prisma/pgdata",
  "logs",
  "coverage",
  "agent-transcripts",
]);

function shouldSkip(abs: string) {
  const rel = relative(root, abs).replace(/\\/g, "/");
  if (!rel || rel.startsWith("..")) return true;
  const parts = rel.split("/");
  if (parts.some((p) => excludeDirs.has(p))) return true;
  if (rel === ".env" || rel.endsWith("/.env")) return true;
  if (rel.endsWith(".zip") || rel.endsWith(".dump") || rel.endsWith(".sql.gz")) return true;
  return false;
}

async function main() {
  // Prefer PowerShell Compress-Archive via a staging list is awkward for large trees.
  // Use tar if available (Windows 10+), else PowerShell.
  if (existsSync(zipPath)) {
    try {
      const { unlinkSync } = await import("node:fs");
      unlinkSync(zipPath);
    } catch {
      /* ignore */
    }
  }

  try {
    execSync(
      `tar -a -c -f "${zipPath}" --exclude=node_modules --exclude=.next --exclude=deploy --exclude=.git --exclude=prisma/pgdata --exclude=logs --exclude=.env --exclude=*.dump --exclude=*.sql.gz -C "${root}" .`,
      { stdio: "inherit", shell: true },
    );
  } catch {
    // Fallback: git archive if repo
    execSync(`git archive -o "${zipPath}" HEAD`, { stdio: "inherit", shell: true, cwd: root });
  }

  const { statSync } = await import("node:fs");
  const mb = (statSync(zipPath).size / (1024 * 1024)).toFixed(1);
  console.log(JSON.stringify({ zip: zipPath, sizeMB: Number(mb), skippedHint: [...excludeDirs] }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
