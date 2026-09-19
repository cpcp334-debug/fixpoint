import type { ReactNode } from "react";

function headingId(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Render markdown-ish hub/blog bodies (## / ### / lists / paragraphs). */
export function renderArticleBody(body: string): ReactNode[] {
  const rawBlocks = body.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  const seenH2 = new Set<string>();
  const blocks: string[] = [];
  let skippingDupSection = false;
  for (const block of rawBlocks) {
    if (block.startsWith("## ")) {
      const title = block.replace(/^##\s+/, "").trim();
      if (seenH2.has(title)) {
        skippingDupSection = true;
        continue;
      }
      seenH2.add(title);
      skippingDupSection = false;
      blocks.push(block);
      continue;
    }
    if (skippingDupSection) continue;
    blocks.push(block);
  }
  return blocks.map((block, i) => {
    if (block.startsWith("## ")) {
      const title = block.replace(/^##\s+/, "");
      return (
        <h2 key={i} id={headingId(title)} className="mt-8 scroll-mt-24 text-xl font-semibold text-navy">
          {title}
        </h2>
      );
    }
    if (block.startsWith("### ")) {
      return (
        <h3 key={i} className="mt-6 text-lg font-semibold text-navy">
          {block.replace(/^###\s+/, "")}
        </h3>
      );
    }
    if (block.startsWith("- ")) {
      const items = block.split("\n").map((l) => l.replace(/^- /, "").trim()).filter(Boolean);
      return (
        <ul key={i} className="mt-3 list-disc space-y-1 ps-5 text-sm leading-relaxed text-muted sm:text-base">
          {items.map((item) => (
            <li key={item.slice(0, 48)}>{item}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i} className="mt-4 text-sm leading-relaxed text-muted whitespace-pre-line sm:text-base">
        {block}
      </p>
    );
  });
}
