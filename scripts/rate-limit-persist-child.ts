/**
 * Child process reader — proves RateLimitBucket survives a separate Node process.
 */
import { prisma } from "../src/server/db";
import { hashRateLimitKey } from "../src/server/rate-limit";

async function main() {
  const key = process.argv[2];
  if (!key) {
    console.error("missing key");
    process.exit(1);
  }

  const row = await prisma.rateLimitBucket.findUnique({ where: { keyHash: hashRateLimitKey(key) } });
  if (!row || row.count < 2) {
    console.error("persist miss");
    process.exit(1);
  }
  console.log("child-ok");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
