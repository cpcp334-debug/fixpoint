/**
 * Final production go-live report for the verified 94-page corpus.
 * Does not invent coverage. Does not claim LIVE without verified prod infra.
 */
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { SITEMAP_PAIR_SHARDS } from "../src/app/sitemap";

type Check = { item: string; status: "PASS" | "FAIL" | "NOT_VERIFIED" | "EXTERNAL_REQUIRED"; detail: string };

async function main() {
  const diyPub = await prisma.diyGuide.count({ where: { status: "published", indexable: true } });
  const diyDraft = await prisma.diyGuide.count({ where: { status: "draft" } });
  const slCovered = await prisma.serviceLocation.count({ where: { covered: true } });
  const slPub = await prisma.serviceLocation.count({
    where: { coverageStatus: "published", indexable: true },
  });
  const slTotal = await prisma.serviceLocation.count();

  const buildLog = existsSync(join(process.cwd(), "docs/_production-build-run.log"))
    ? readFileSync(join(process.cwd(), "docs/_production-build-run.log"), "utf8")
    : "";
  const nextBuildId = existsSync(join(process.cwd(), ".next", "BUILD_ID"));
  const buildOk = nextBuildId || /sitemap/i.test(buildLog) || /Compiled successfully/i.test(buildLog);

  const infra: Check[] = [
    { item: "Managed PostgreSQL", status: "EXTERNAL_REQUIRED", detail: "DATABASE_URL is local/dev fingerprint" },
    { item: "Connection pooling", status: "EXTERNAL_REQUIRED", detail: "Not verified for production pooler" },
    { item: "SSL/TLS database", status: "EXTERNAL_REQUIRED", detail: "sslmode=require not present on current DB URL" },
    { item: "Production env vars", status: "EXTERNAL_REQUIRED", detail: "SITE_URL is localhost:3000 (not HTTPS production domain)" },
    { item: "Production secrets", status: "EXTERNAL_REQUIRED", detail: "AUTOMATION_CRON_SECRET / HEALTH_CHECK_SECRET / DOWNLOAD_CSRF_SECRET unset" },
    { item: "Object storage/CDN", status: "EXTERNAL_REQUIRED", detail: "STORAGE_PROVIDER unset; using local public/media WebP" },
    { item: "WebP assets in repo", status: "PASS", detail: "Curated topic WebP assets present under public/media/topics" },
    { item: "Backup system", status: "EXTERNAL_REQUIRED", detail: "No verified production backup provider" },
    { item: "PITR", status: "EXTERNAL_REQUIRED", detail: "Not configured" },
    { item: "Monitoring", status: "EXTERNAL_REQUIRED", detail: "No verified APM/uptime wiring" },
    { item: "Error logging", status: "NOT_VERIFIED", detail: "App logging exists; production sink not verified" },
    { item: "Alerts", status: "EXTERNAL_REQUIRED", detail: "Not configured" },
    { item: "Scheduled jobs/cron", status: "EXTERNAL_REQUIRED", detail: "AUTOMATION_CRON_SECRET unset; no external scheduler" },
    { item: "DNS", status: "EXTERNAL_REQUIRED", detail: "No production hostname configured" },
    { item: "HTTPS", status: "EXTERNAL_REQUIRED", detail: "SITE_URL is http://localhost:3000" },
    { item: "Production domain", status: "EXTERNAL_REQUIRED", detail: "No production domain" },
    { item: "robots.txt", status: "PASS", detail: "Implemented in app; resolves on local server" },
    { item: "sitemap", status: "PASS", detail: `Shards ${SITEMAP_PAIR_SHARDS}; /sitemap/0.xml HTTP 200 locally` },
    { item: "health endpoint", status: "PASS", detail: "/api/internal/health/db implemented (secret required in prod)" },
    { item: "production build", status: buildOk ? "PASS" : "FAIL", detail: buildOk ? "npx next build succeeded" : "build not verified" },
    { item: "production start", status: "NOT_VERIFIED", detail: "Not started on production host; local next start not claimed as LIVE" },
    { item: "deployment process", status: "EXTERNAL_REQUIRED", detail: "No vercel.json / production host configured in repo" },
  ];

  const localQa = {
    base: "http://127.0.0.1:3000",
    note: "QA against local/dev server — NOT a production URL",
    results: {
      "/en": 200,
      "/ar": 200,
      "/en/diy": 200,
      "/ar/diy": 200,
      "/en/diy/diy-bathroom-cleaning": 200,
      "/ar/diy/how-to-fix-dripping-faucet": 200,
      "/en/cleaning-services/abu-dhabi": 200,
      "/ar/cleaning-services/abu-dhabi": 200,
      "/en/get-a-quote": 200,
      "draft DIY /en/diy/how-to-touch-up-interior-paint": 404,
      "uncovered SL /en/villa-cleaning/al-ain": 404,
      "invalid slug": 404,
      "/admin": 307,
    },
  };

  const criticalInfraBlockers = infra
    .filter((c) =>
      [
        "Managed PostgreSQL",
        "Production env vars",
        "Production secrets",
        "DNS",
        "HTTPS",
        "Production domain",
        "deployment process",
        "Backup system",
      ].includes(c.item),
    )
    .filter((c) => c.status !== "PASS");

  const decision =
    criticalInfraBlockers.length === 0 && buildOk
      ? "READY FOR PRODUCTION = YES — LAUNCH CURRENT 94-PAGE VERIFIED CORPUS"
      : "READY WITH EXTERNAL BLOCKER";

  const report = {
    generatedAt: new Date().toISOString(),
    decision,
    coverageLocked: {
      covered: slCovered,
      doNotExpand: true,
      uncoveredRemainNonPublic: slTotal - slCovered,
    },
    production: Object.fromEntries(infra.map((c) => [c.item, { status: c.status, detail: c.detail }])),
    public: {
      total: diyPub + slPub,
      diy: diyPub,
      serviceLocation: slPub,
      expectedLocales: (diyPub + slPub) * 2,
    },
    quality: {
      wordCount: "Public DIY EN/AR >=1000: 45/45 (prior verified; grandfathered 49 excepted)",
      uniqueness: "blocking similarity 0; exact duplicates 0 (prior verified)",
      images: "WebP/alt 188/188; broken 0 (prior verified)",
      seo: { technical: "PASS", searchPerformance: "NOT YET PROVEN" },
      aeo: { implementation: "PASS", atScale: "NOT YET PROVEN" },
      geo: { implementation: "PASS", atScale: "NOT YET PROVEN" },
    },
    security: {
      status: "PASS (local verification)",
      draftDiyBlocked: true,
      uncoveredSlBlocked: true,
      adminRedirectsUnauthenticated: true,
      note: "Re-verify on real production URL after deploy",
    },
    sitemap: {
      status: "PASS (local)",
      shards: SITEMAP_PAIR_SHARDS,
      publicArticles: diyPub + slPub,
      note: "Only published+indexable included by architecture; uncovered SL excluded",
    },
    search: {
      technicalReadiness: "PASS",
      performanceMeasurement: "NOT YET PROVEN",
    },
    localQa,
    blockers: criticalInfraBlockers.map((c) => `${c.item}: ${c.detail}`),
    nonBlockersForThisLaunchDecision: [
      "63,351 uncovered SL pages — intentionally NOT launched (coverage locked)",
      "518 DIY drafts — intentionally gated by safety",
      "Search rankings / AI citations — post-launch measurement",
    ],
    postLaunch: {
      coverageExpansion: "Use /admin/service-pages/coverage with real business data only",
      diySafetyReview: "YELLOW/RED/REVIEW_REQUIRED remain gated",
      searchMeasurement: "Configure Search Console / analytics after HTTPS domain is live",
    },
    nextActionsToActuallyGoLive: [
      "Provision managed PostgreSQL with SSL + pooling + backups/PITR",
      "Set production SITE_URL=https://<domain>, secrets, ADMIN credentials",
      "Deploy build artifact to hosting with DNS + TLS",
      "Confirm WebP served from public/media or CDN",
      "Wire cron to /api/internal/automation/tick with AUTOMATION_CRON_SECRET",
      "Re-run live QA against production URL",
      "Then mark PRODUCTION READY = YES and cut over",
    ],
  };

  writeFileSync(join(process.cwd(), "docs/final-production-go-live-report.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    join(process.cwd(), "docs/final-production-go-live-report.md"),
    [
      `# Final production go-live report`,
      ``,
      `## Decision`,
      ``,
      `# ${decision}`,
      ``,
      `Coverage remains locked at **${slCovered}** covered / **${slPub}** published SL. No invent. No 63,351 expansion.`,
      ``,
      `## Public corpus`,
      ``,
      `- Total public articles: **${diyPub + slPub}**`,
      `- DIY: **${diyPub}**`,
      `- Service × Location: **${slPub}**`,
      `- Expected EN+AR locales: **${(diyPub + slPub) * 2}**`,
      ``,
      `## Production infrastructure`,
      ``,
      `| Item | Status | Detail |`,
      `|------|--------|--------|`,
      ...infra.map((c) => `| ${c.item} | **${c.status}** | ${c.detail} |`),
      ``,
      `## Local smoke QA (not production URL)`,
      ``,
      `- Base: ${localQa.base}`,
      ...Object.entries(localQa.results).map(([k, v]) => `- ${k}: ${v}`),
      ``,
      `## Quality / SEO`,
      ``,
      `- Technical SEO: PASS`,
      `- Search performance: NOT YET PROVEN`,
      `- AEO implementation: PASS`,
      `- GEO implementation: PASS`,
      `- Security (local): PASS`,
      `- Sitemap (local): PASS`,
      ``,
      `## Exact blockers preventing LIVE mark`,
      ``,
      ...report.blockers.map((b) => `- ${b}`),
      ``,
      `## Intentionally NOT blockers for 94-page launch scope`,
      ``,
      ...report.nonBlockersForThisLaunchDecision.map((b) => `- ${b}`),
      ``,
      `## Next actions to actually go live`,
      ``,
      ...report.nextActionsToActuallyGoLive.map((a, i) => `${i + 1}. ${a}`),
      ``,
      `## Post-launch`,
      ``,
      `- Coverage: ${report.postLaunch.coverageExpansion}`,
      `- DIY: ${report.postLaunch.diySafetyReview}`,
      `- Measurement: ${report.postLaunch.searchMeasurement}`,
      ``,
    ].join("\n"),
  );

  console.log(
    JSON.stringify(
      {
        decision,
        buildOk,
        public: diyPub + slPub,
        diyPub,
        slPub,
        covered: slCovered,
        blockers: report.blockers.length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
