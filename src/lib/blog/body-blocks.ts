export type BlogBodyBlock =
  | { kind: "h2"; text: string; id: string }
  | { kind: "h3" | "paragraph"; text: string }
  | { kind: "list"; items: string[] };

type RawBlock =
  | { kind: "h2"; text: string }
  | { kind: "h3" | "paragraph"; text: string }
  | { kind: "list"; items: string[] };

export type BlogHeading = Extract<BlogBodyBlock, { kind: "h2" }>;

// Keep ordinary fragment IDs stable. Suffixes only resolve collisions.
function headingId(title: string) {
  return `s-${title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 64)}`;
}

function isEditorialHeading(title: string) {
  // A Unicode boundary also recognises Arabic labels, unlike JavaScript \b.
  return /^(?:Field detail|تفصيل ميداني|Exclusive checkpoint|نقطة تحقق حصرية|Documentation markers|علامات توثيق)(?:$|[^\p{L}\p{N}_])/iu.test(title);
}

/** Parse once so the article and its contents navigation share titles and IDs. */
export function parseBlogBody(body: string, usedIds = new Set<string>()) {
  const raw: RawBlock[] = [];
  let paragraph: string[] = [];
  let items: string[] = [];
  const flush = () => {
    if (paragraph.length) raw.push({ kind: "paragraph", text: paragraph.join("\n").trim() });
    if (items.length) raw.push({ kind: "list", items });
    paragraph = [];
    items = [];
  };

  for (const line of body.replace(/\r\n?/g, "\n").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    const heading = /^(#{2,3})[ \t]+(.+)$/.exec(trimmed);
    if (heading) {
      flush();
      raw.push({ kind: heading[1] === "##" ? "h2" : "h3", text: heading[2].trim() });
    } else if (trimmed.startsWith("- ")) {
      if (paragraph.length) flush();
      items.push(trimmed.slice(2).trim());
    } else {
      if (items.length) flush();
      paragraph.push(line);
    }
  }
  flush();

  const blocks: BlogBodyBlock[] = [];
  const outline: BlogHeading[] = [];
  const seenH2 = new Set<string>();
  let skippingDuplicateSection = false;
  for (const block of raw) {
    if (block.kind === "h2") {
      // Preserve the historical padToWords duplicate-section suppression.
      skippingDuplicateSection = seenH2.has(block.text);
      if (skippingDuplicateSection) continue;
      seenH2.add(block.text);
      const base = headingId(block.text);
      let id = base;
      for (let suffix = 2; usedIds.has(id); suffix++) id = `${base}-${suffix}`;
      usedIds.add(id);
      const heading: BlogHeading = { kind: "h2", text: block.text, id };
      blocks.push(heading);
      // Editorial headings stay in the body but are omitted from the contents.
      if (!isEditorialHeading(block.text)) outline.push(heading);
    } else if (!skippingDuplicateSection) {
      blocks.push(block);
    }
  }
  return { blocks, outline };
}
