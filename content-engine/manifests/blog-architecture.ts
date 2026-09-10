/**
 * Blog architecture (routes already in app) — engine support only.
 * Do NOT generate the 45 editorial articles in Phase 1.
 */
export const BLOG_ARCHITECTURE = {
  routes: ["/en/blog", "/ar/blog", "/en/blog/[slug]", "/ar/blog/[slug]"],
  initialEditorialTarget: 45,
  generateInPhase1: false,
  rules: [
    "Blog articles are NOT copies of DIY / service / location pages",
    "Each public blog: 1000+ words, unique, useful, WebP+alt, SEO, AEO, GEO where relevant, EN/AR",
    "Publication only via gate + human approval",
  ],
  existingAppPaths: [
    "src/app/[locale]/blog",
    "src/lib/blog/catalog.ts",
    "src/lib/blog/categories.ts",
  ],
  phase1Status: "architecture acknowledged; generation deferred",
};

export function blogArchitectureStatus() {
  return BLOG_ARCHITECTURE;
}
