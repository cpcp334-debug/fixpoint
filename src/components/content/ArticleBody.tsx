import type { ReactNode } from "react";

function headingId(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Render markdown-ish hub/blog bodies (## / ### / lists / paragraphs). */
export function renderArticleBody(
  body: string,
  { deduplicateSections = true, headingLevel = 2 }: { deduplicateSections?: boolean; headingLevel?: 2 | 3 } = {},
): ReactNode[] {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const Subheading = headingLevel === 3 ? "h4" : "h3";
  const rawBlocks = body.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  const seenH2 = new Set<string>();
  const blocks: string[] = [];
  let skippingDupSection = false;
  for (const block of rawBlocks) {
    if (block.startsWith("## ")) {
      const title = block.replace(/^##\s+/, "").trim();
      if (deduplicateSections && seenH2.has(title)) {
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
        <Heading key={i} id={deduplicateSections ? headingId(title) : `${headingId(title)}-${i}`} className="mt-8 scroll-mt-24 text-xl font-semibold text-navy">
          {title}
        </Heading>
      );
    }
    if (block.startsWith("### ")) {
      return (
        <Subheading key={i} className="mt-6 text-lg font-semibold text-navy">
          {block.replace(/^###\s+/, "")}
        </Subheading>
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
