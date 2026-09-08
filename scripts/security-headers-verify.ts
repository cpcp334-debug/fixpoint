/**
 * FIX 6 — CSP/HSTS + download CSRF verification.
 * Does not call live OpenAI or wipe business data.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildContentSecurityPolicy,
  cspHeaderName,
  shouldSendHsts,
  securityHeadersList,
} from "../src/server/security-headers";
import {
  DOWNLOAD_CSRF_TTL_MS,
  isCrossSiteDownloadRequest,
  mintDownloadCsrf,
  verifyDownloadCsrf,
} from "../src/lib/admin/download-csrf";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

const SECRET = "fix6-download-csrf-secret-32chars-min!!";

async function main() {
  const root = process.cwd();
  const exportsRoute = readFileSync(join(root, "src/app/api/admin/exports/route.ts"), "utf8");
  const quoteRoute = readFileSync(join(root, "src/app/api/admin/quotes/[id]/pdf/route.ts"), "utf8");
  const invoiceRoute = readFileSync(join(root, "src/app/api/admin/invoices/[id]/pdf/route.ts"), "utf8");
  const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");
  const csrfSrc = readFileSync(join(root, "src/lib/admin/download-csrf.ts"), "utf8");
  const headersSrc = readFileSync(join(root, "src/server/security-headers.ts"), "utf8");
  const docs = readFileSync(join(root, "docs/security-headers-downloads.md"), "utf8");
  const envExample = readFileSync(join(root, ".env.example"), "utf8");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { scripts: Record<string, string> };

  assert(nextConfig.includes("securityHeadersList"), "next.config uses securityHeadersList");
  assert(docs.includes("DOWNLOAD_CSRF_SECRET"), "docs document secret");
  assert(envExample.includes("DOWNLOAD_CSRF_SECRET"), ".env.example documents secret");
  assert(!csrfSrc.includes("console.log") || !/console\.log\([^)]*SECRET/.test(csrfSrc), "secret not logged");
  assert(pkg.scripts["verify:security-headers"]?.includes("security-headers"), "verify script registered");

  // CSP production enforce / development report-only
  assert(cspHeaderName({ NODE_ENV: "production" }) === "Content-Security-Policy", "prod CSP enforced");
  assert(cspHeaderName({ NODE_ENV: "development" }) === "Content-Security-Policy-Report-Only", "dev CSP report-only");
  const csp = buildContentSecurityPolicy({ NODE_ENV: "production" });
  assert(csp.includes("default-src 'self'"), "csp default-src self");
  assert(csp.includes("script-src 'self' 'unsafe-inline'"), "csp script pragmatic");
  assert(csp.includes("style-src 'self' 'unsafe-inline'"), "csp style pragmatic");
  assert(csp.includes("font-src 'self'"), "csp fonts self");
  assert(!csp.includes(" *") && !csp.includes("* "), "no broad wildcard in csp");
  assert(!csp.includes("fonts.googleapis.com"), "no unnecessary google fonts host");

  const cspWithGa = buildContentSecurityPolicy({ NODE_ENV: "production", NEXT_PUBLIC_GA_ID: "G-TEST" });
  assert(cspWithGa.includes("googletagmanager.com"), "GA hosts only when configured");

  // HSTS
  assert(shouldSendHsts({ NODE_ENV: "production", SITE_URL: "https://example.com" }), "HSTS prod https");
  assert(!shouldSendHsts({ NODE_ENV: "production", SITE_URL: "http://example.com" }), "no HSTS non-https");
  assert(!shouldSendHsts({ NODE_ENV: "development", SITE_URL: "https://example.com" }), "no HSTS development");
  assert(!shouldSendHsts({ NODE_ENV: "production", SITE_URL: "http://localhost:3000" }), "no HSTS localhost http");
  assert(!shouldSendHsts({ NODE_ENV: "production", SITE_URL: "https://localhost:3000" }), "no HSTS localhost https");
  assert(
    !securityHeadersList({ NODE_ENV: "production", SITE_URL: "https://localhost:3000" }).some((h) => h.key === "Strict-Transport-Security"),
    "localhost headers omit HSTS",
  );
  assert(
    securityHeadersList({ NODE_ENV: "production", SITE_URL: "https://www.example.com" }).some((h) => h.key === "Strict-Transport-Security"),
    "prod https includes HSTS",
  );
  assert(
    securityHeadersList({ NODE_ENV: "development", SITE_URL: "http://localhost:3000" }).some(
      (h) => h.key === "Content-Security-Policy-Report-Only",
    ),
    "dev uses CSP report-only",
  );
  assert(
    securityHeadersList({ NODE_ENV: "production", SITE_URL: "https://www.example.com" }).some((h) => h.key === "Content-Security-Policy"),
    "prod uses CSP enforce",
  );

  for (const route of [exportsRoute, quoteRoute, invoiceRoute]) {
    assert(route.includes("export async function GET"), "GET handler exists");
    assert(route.includes("status: 405") || route.includes("405"), "GET returns 405");
    assert(route.includes("export async function POST"), "POST handler exists");
    assert(route.includes("verifyDownloadCsrf"), "POST verifies CSRF");
    assert(route.includes("isCrossSiteDownloadRequest"), "POST checks cross-site");
    assert(route.includes("Content-Disposition"), "download disposition preserved");
  }

  const env = { ...process.env, DOWNLOAD_CSRF_SECRET: SECRET, NODE_ENV: "test" };

  // Missing secret fails closed
  const missing = mintDownloadCsrf("user-a", { env: { NODE_ENV: "production", DOWNLOAD_CSRF_SECRET: "" } });
  assert(!missing.ok && missing.reason === "missing_secret", "prod missing secret fails closed");

  const short = mintDownloadCsrf("user-a", { env: { NODE_ENV: "production", DOWNLOAD_CSRF_SECRET: "short" } });
  assert(!short.ok, "short secret rejected");

  const minted = mintDownloadCsrf("user-a", { env });
  assert(minted.ok, "mint succeeds with secret");
  assert(minted.ok && !minted.token.includes(SECRET), "token does not contain secret");

  assert(verifyDownloadCsrf(minted.ok ? minted.token : "", "user-a", { env }).ok, "valid CSRF ok");
  assert(verifyDownloadCsrf("", "user-a", { env }).ok === false, "missing CSRF fails");
  assert(verifyDownloadCsrf("not-a-token", "user-a", { env }).ok === false, "invalid CSRF fails");
  assert(verifyDownloadCsrf(minted.ok ? minted.token : "", "user-b", { env }).ok === false, "other user fails");

  const expired = mintDownloadCsrf("user-a", { env, now: Date.now() - DOWNLOAD_CSRF_TTL_MS - 1000, ttlMs: 1000 });
  assert(expired.ok, "can mint expired-window token for test");
  assert(
    verifyDownloadCsrf(expired.ok ? expired.token : "", "user-a", { env, now: Date.now() }).ok === false,
    "expired CSRF fails",
  );

  assert(
    isCrossSiteDownloadRequest(
      new Request("https://app.example/api/admin/exports", {
        method: "POST",
        headers: { "sec-fetch-site": "cross-site", origin: "https://evil.example" },
      }),
    ),
    "cross-site flagged",
  );
  assert(
    !isCrossSiteDownloadRequest(
      new Request("https://app.example/api/admin/exports", {
        method: "POST",
        headers: { "sec-fetch-site": "same-origin", origin: "https://app.example" },
      }),
    ),
    "same-origin allowed",
  );

  // RBAC still referenced in routes
  assert(exportsRoute.includes("requireStaff"), "exports auth");
  assert(quoteRoute.includes('requireStaff("quotes")'), "quotes RBAC");
  assert(invoiceRoute.includes('requireStaff("invoices")'), "invoices RBAC");

  // UI uses POST forms
  const exportsPage = readFileSync(join(root, "src/app/admin/exports/page.tsx"), "utf8");
  assert(exportsPage.includes("AdminDownloadForm"), "exports use download form");
  assert(!exportsPage.includes('href={`/api/admin/exports'), "exports no GET href");
  assert(headersSrc.includes("shouldSendHsts"), "hsts helper present");

  console.log("Security headers / download CSRF verification passed.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
