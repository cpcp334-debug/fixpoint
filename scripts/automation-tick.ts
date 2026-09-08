import { processDueJobs } from "../src/lib/automation/tick";

async function main() {
  const result = await processDueJobs();
  process.stdout.write(`automation tick ${JSON.stringify(result)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
