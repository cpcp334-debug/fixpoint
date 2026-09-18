/**
 * Load .env.mysql then run publish-service-estate-city-blogs.ts
 * Usage: npx tsx scripts/run-sec-blog-publish.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const envPath = resolve(process.cwd(), ".env.mysql");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
  const u = process.env.DATABASE_URL || "";
  console.log(
    JSON.stringify({
      phase: "env",
      loaded: ".env.mysql",
      provider: u.startsWith("mysql") ? "mysql" : u.startsWith("postgres") ? "postgres" : "other",
      host: u.replace(/:[^:@/]+@/, ":***@").replace(/^[^:]+:\/\//, "").split("/")[0],
    }),
  );
} else {
  console.log(JSON.stringify({ phase: "env", loaded: "missing .env.mysql", cwd: process.cwd() }));
}

const r = spawnSync(
  "npx",
  ["tsx", "scripts/publish-service-estate-city-blogs.ts"],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: true,
  },
);
process.exit(r.status ?? 1);
