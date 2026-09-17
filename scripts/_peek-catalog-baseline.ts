import { readFileSync } from "node:fs";
import { APPROVED_CATEGORIES, APPROVED_CHILDREN, assertCatalogA1Counts } from "../prisma/data/catalog-a1";

const counts = assertCatalogA1Counts();
const electrical = APPROVED_CHILDREN.filter((c) => c.categorySlug === "electrical");
console.log(
  JSON.stringify(
    {
      counts,
      electricalChildren: electrical.length,
      electricalNames: electrical.map((c) => c.nameEn),
      parents: APPROVED_CATEGORIES.map((c) => ({ slug: c.slug, name: c.nameEn })),
    },
    null,
    2,
  ),
);

const matrix = JSON.parse(readFileSync("docs/diy-classification-matrix-311.json", "utf8"));
const elecMatrix = matrix.rows.filter((r: { kind: string; parentSlug?: string }) => r.kind === "child" && r.parentSlug === "electrical");
console.log("matrixElectrical", elecMatrix.length);
