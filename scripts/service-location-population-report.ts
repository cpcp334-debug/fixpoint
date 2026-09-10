/**
 * Writes docs/service-location-population-report.json from live DB.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { measureServiceLocationPopulation } from "../src/lib/service-location/population";

async function main() {
  const snap = await measureServiceLocationPopulation(prisma);
  const out = {
    generatedAt: new Date().toISOString(),
    ...snap,
  };
  const path = join(process.cwd(), "docs/service-location-population-report.json");
  writeFileSync(path, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(out, null, 2));
  if (snap.legitimacy !== "DOCUMENTED_LEGACY_PLUS_APPROVED_MATRIX") {
    process.exitCode = 2;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
