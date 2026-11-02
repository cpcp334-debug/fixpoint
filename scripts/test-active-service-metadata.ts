import assert from "node:assert/strict";
import { sanitizePublicServiceI18n } from "../src/lib/catalog/public-i18n";

const name = "Water Leakage Detection";
const seed = `${name} is a draft catalog offering and is not publicly offered until activated.`;
const translation = {
  locale: "en", name, shortDescription: seed, longDescription: "A reviewed overview.",
  metaDescription: seed, seoTitle: "Reviewed service title",
};
const row = { status: "active", slug: "water-leakage-detection", category: { slug: "plumbing" }, translations: [translation] };
const before = JSON.stringify(row);
const result = sanitizePublicServiceI18n(row, "en", translation);
assert.equal(result.metaDescription, result.shortDescription.slice(0, 155));
assert(!result.metaDescription.includes("draft catalog"));
assert.equal(result.seoTitle, translation.seoTitle);
assert.equal(JSON.stringify(row), before, "Do not rewrite stored input objects");

for (const status of ["draft", "inactive", undefined]) {
  assert.equal(sanitizePublicServiceI18n({ ...row, status }, "en", translation).metaDescription, seed);
}
for (const metaDescription of ["A custom plumbing description.", "Ask whether a draft catalog offering is available.", "", undefined]) {
  const custom = { ...translation, metaDescription };
  assert.equal(sanitizePublicServiceI18n({ ...row, translations: [custom] }, "en", custom).metaDescription, metaDescription || "");
}
const edited = { ...translation, shortDescription: "A reviewed enquiry description. ".repeat(8) };
assert.equal(sanitizePublicServiceI18n({ ...row, translations: [edited] }, "en", edited).metaDescription, edited.shortDescription.trim().slice(0, 155));
const blank = { ...translation, shortDescription: "REVIEW_REQUIRED" };
assert.equal(sanitizePublicServiceI18n({ ...row, translations: [blank] }, "en", blank).metaDescription, result.metaDescription);
const arabic = { ...translation, locale: "ar", name: "كشف تسرب المياه", metaDescription: "وصف عربي مراجع" };
assert.equal(sanitizePublicServiceI18n({ ...row, translations: [translation, arabic] }, "ar", arabic).metaDescription, arabic.metaDescription);
const arabicSeed = { ...arabic, metaDescription: `${arabic.name} is a draft catalog offering and is not publicly offered until activated.` };
assert.equal(sanitizePublicServiceI18n({ ...row, translations: [translation, arabicSeed] }, "ar", arabicSeed).metaDescription, arabicSeed.metaDescription);
console.log("Active-service metadata: seed replacement, draft/custom/Arabic preservation, visible-copy fallback, length and immutability checks passed.");
