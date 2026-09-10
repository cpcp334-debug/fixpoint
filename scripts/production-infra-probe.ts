/**
 * Probe production readiness flags without printing secret values.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function parseEnv(raw: string) {
  const map = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    map.set(k, v);
  }
  return map;
}

function main() {
  const envPath = join(process.cwd(), ".env");
  const env = existsSync(envPath) ? parseEnv(readFileSync(envPath, "utf8")) : new Map();
  const site = env.get("SITE_URL") || "";
  const db = env.get("DATABASE_URL") || "";
  const topics = join(process.cwd(), "public", "media", "topics");
  const webpCount = existsSync(topics)
    ? readdirSync(topics).filter((f) => f.endsWith(".webp")).length
    : 0;

  const report = {
    hasEnv: existsSync(envPath),
    hasDockerComposeDevOnly: existsSync(join(process.cwd(), "docker-compose.yml")),
    hasVercelConfig: existsSync(join(process.cwd(), "vercel.json")),
    webpTopicAssets: webpCount,
    SITE_URL: {
      set: Boolean(site),
      https: /^https:\/\//i.test(site),
      localhost: /localhost|127\.0\.0\.1/i.test(site),
      host: site.replace(/^https?:\/\//i, "").split("/")[0] || null,
    },
    DATABASE_URL: {
      set: Boolean(db),
      local: /localhost|127\.0\.0\.1|5433|pgbouncer=true|connection_limit=1/i.test(db),
      sslRequire: /sslmode=require/i.test(db),
    },
    secretsPresent: {
      AUTOMATION_CRON_SECRET: Boolean(env.get("AUTOMATION_CRON_SECRET")),
      HEALTH_CHECK_SECRET: Boolean(env.get("HEALTH_CHECK_SECRET")),
      ADMIN_EMAIL: Boolean(env.get("ADMIN_EMAIL")),
      ADMIN_PASSWORD: Boolean(env.get("ADMIN_PASSWORD")),
      DOWNLOAD_CSRF_SECRET: Boolean(env.get("DOWNLOAD_CSRF_SECRET")),
      OPENAI_API_KEY: Boolean(env.get("OPENAI_API_KEY")),
    },
    STORAGE_PROVIDER: env.get("STORAGE_PROVIDER") || "unset",
  };
  console.log(JSON.stringify(report, null, 2));
}

main();
