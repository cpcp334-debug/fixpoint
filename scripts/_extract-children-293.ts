import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("docs/diy-classification-matrix-311.json", "utf8"));

let offerings: Array<{
  kind: string;
  parentCategory: string;
  serviceOffering: string;
  offeringSlug: string;
  n?: number;
}> | null = null;

for (const [k, v] of Object.entries(data)) {
  if (Array.isArray(v) && v[0] && typeof v[0] === "object" && v[0] !== null && "kind" in (v[0] as object)) {
    offerings = v as typeof offerings;
    console.log("arrayKey", k, "len", (v as unknown[]).length);
    break;
  }
}

if (!offerings) {
  console.error("no offerings array");
  process.exit(1);
}

const parents = offerings.filter((o) => o.kind === "parent");
const children = offerings.filter((o) => o.kind === "child");
const other = offerings.filter((o) => o.kind !== "parent" && o.kind !== "child");

const slugs = children.map((c) => c.offeringSlug);
const dup = [...new Set(slugs.filter((s, i) => slugs.indexOf(s) !== i))];

console.log(
  JSON.stringify(
    {
      total: offerings.length,
      parents: parents.length,
      children: children.length,
      other: other.length,
      dupSlugCount: dup.length,
      dup,
      parentSlugs: parents.map((p) => p.offeringSlug),
    },
    null,
    2,
  ),
);

const lines = children.map(
  (c, i) => `${i + 1}. ${c.parentCategory} | ${c.serviceOffering} | ${c.offeringSlug}`,
);
writeFileSync("docs/_children-293-extract.txt", `${lines.join("\n")}\n\nTOTAL=${children.length}\n`, "utf8");
console.log("VERIFY_TOTAL", children.length);
