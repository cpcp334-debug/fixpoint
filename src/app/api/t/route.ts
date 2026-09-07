import { ingestClientEvents } from "@/lib/analytics/ingest";

export async function POST(request: Request) {
  return ingestClientEvents(request);
}
