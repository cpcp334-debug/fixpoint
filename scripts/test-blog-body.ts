import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BlogBody } from "../src/components/blog/BlogBody";
import { parseBlogBody } from "../src/lib/blog/body-blocks";

function render(body: string, usedIds?: Set<string>) {
  const parsed = parseBlogBody(body, usedIds);
  const html = renderToStaticMarkup(createElement(BlogBody, { blocks: parsed.blocks }));
  const ids = [...html.matchAll(/<h2[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, "rendered heading IDs must be unique");
  for (const heading of parsed.outline) {
    assert.equal(ids.filter((id) => id === heading.id).length, 1, "each contents link must have one target");
  }
  return { ...parsed, html, ids };
}

for (const newline of ["\n", "\r\n", "\r"]) {
  for (const sample of [
    { title: "Define the package", paragraph: "Keep this paragraph outside the heading.", id: "s-define-the-package" },
    { title: "عرف الحزمة قبل الأسبوع الأخير", paragraph: "أعد قائمة الأنظمة والمناطق التي يتناولها العمل.", id: "s-عرف-الحزمة-قبل-الأسبوع-الأخير" },
  ]) {
    test(`${sample.id}: one-line heading with ${JSON.stringify(newline)} before prose`, () => {
      const result = render(`## ${sample.title}${newline}${sample.paragraph}`);
      assert.deepEqual(result.outline.map(({ text, id }) => ({ text, id })), [{ text: sample.title, id: sample.id }]);
      assert.deepEqual(result.blocks.map((b) => b.kind), ["h2", "paragraph"]);
      assert.match(result.html, new RegExp(`>${sample.title}</h2><p[^>]*>${sample.paragraph}</p>`));
    });
  }
}

test("ordinary blank-line headings retain their previous IDs and paragraph breaks", () => {
  const result = render("## Scope & Access\n\nFirst paragraph.\n\nSecond paragraph.\n\n## Handover\n\nLast paragraph.");
  assert.deepEqual(result.ids, ["s-scope-access", "s-handover"]);
  assert.deepEqual(result.blocks.map((b) => b.kind), ["h2", "paragraph", "paragraph", "h2", "paragraph"]);
});

test("H3 and following prose remain separate without blank lines", () => {
  const result = render("## Main\nIntro.\n### تفاصيل التنفيذ\nهذه فقرة مستقلة.\n## End\nLast.");
  assert.deepEqual(result.blocks.map((b) => b.kind), ["h2", "paragraph", "h3", "paragraph", "h2", "paragraph"]);
  assert.match(result.html, />تفاصيل التنفيذ<\/h3><p[^>]*>هذه فقرة مستقلة\.<\/p>/);
});

test("lists, prose and bare HTTPS links retain their order and text", () => {
  const result = render("Intro\n## Scope\nText before list\n- Cable\n- Earthing\nText after list\nhttps://example.com/spec\n### Records\nKeep records.");
  assert.deepEqual(result.blocks.map((b) => b.kind), ["paragraph", "h2", "paragraph", "list", "paragraph", "h3", "paragraph"]);
  assert.match(result.html, /<li>Cable<\/li><li>Earthing<\/li>/);
  assert.match(result.html, /href="https:\/\/example.com\/spec"/);
  assert.match(result.html, /target="_blank"/);
  const text = result.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  assert.equal(text, "Intro Scope Text before list Cable Earthing Text after list https://example.com/spec Records Keep records.");
});

test("historically padded duplicate H2 sections are still suppressed", () => {
  const result = render("## Scope\nOriginal.\n## Scope\nPadded duplicate.\n### Duplicate subheading\n- Duplicate list\n## Handover\nKeep this.");
  assert.deepEqual(result.ids, ["s-scope", "s-handover"]);
  assert.ok(result.html.includes("Original."));
  assert.ok(result.html.includes("Keep this."));
  assert.ok(!result.html.includes("Padded duplicate"));
  assert.ok(!result.html.includes("Duplicate subheading"));
  assert.ok(!result.html.includes("Duplicate list"));
});

test("editorial labels remain in the body and are excluded from contents in both languages", () => {
  const labels = ["Field detail", "تفصيل ميداني", "Exclusive checkpoint", "نقطة تحقق حصرية", "Documentation markers", "علامات توثيق"];
  const result = render(labels.map((label) => `## ${label}\nKeep evidence.`).join("\n") + "\n## Useful heading\nBuyer guidance.");
  assert.equal(result.ids.length, 7);
  assert.deepEqual(result.outline.map((h) => h.text), ["Useful heading"]);
  for (const label of labels) assert.ok(result.html.includes(label));
});

test("distinct headings that normalize to the same fragment remain individually addressable", () => {
  const long = "A".repeat(64);
  const result = render(`## Scope!\nOne.\n## Scope?\nTwo.\n## Scope-2\nThree.\n## ${long} one\nFour.\n## ${long} two\nFive.`);
  assert.deepEqual(result.ids.slice(0, 3), ["s-scope", "s-scope-2", "s-scope-2-2"]);
  assert.equal(result.outline.length, 5);
});

test("body and supplemental DIY headings can share one page ID registry", () => {
  const ids = new Set<string>();
  const main = render("## Scope\nMain text.", ids);
  const diy = render("## Scope\nAdditional text.", ids);
  assert.deepEqual(main.ids, ["s-scope"]);
  assert.deepEqual(diy.ids, ["s-scope-2"]);
});

test("fourteen adjacent Arabic sections retain every word and resolve every contents link", () => {
  const samples = Array.from({ length: 14 }, (_, i) => ({ title: `عنوان القسم ${i + 1}`, paragraph: `تفاصيل العمل للقسم ${i + 1} مع حفظ جميع الكلمات.` }));
  const result = render(samples.map((s) => `## ${s.title}\n${s.paragraph}`).join("\n"));
  assert.equal(result.outline.length, 14);
  assert.equal(result.blocks.filter((b) => b.kind === "paragraph").length, 14);
  const text = result.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  assert.equal(text, samples.map((s) => `${s.title} ${s.paragraph}`).join(" "));
});

test("HTML-looking source remains escaped text", () => {
  const result = render('## <script>alert(1)</script>\n<img src=x onerror=alert(1)>');
  assert.ok(!result.html.includes("<script>"));
  assert.ok(!result.html.includes("<img"));
  assert.ok(result.html.includes("&lt;script&gt;"));
});
