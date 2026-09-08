import { timingSafeEqual } from "node:crypto";
import { processDueJobs } from "@/lib/automation/tick";
import { rateLimit } from "@/server/rate-limit";

export function tickSecretConfigured() {
  const secret = process.env.AUTOMATION_CRON_SECRET || "";
  return secret.length >= 16;
}

export function authorizeTick(request: Request) {
  const secret = process.env.AUTOMATION_CRON_SECRET || "";
  if (secret.length < 16) return false;
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const alt = request.headers.get("x-automation-secret") || "";
  return secretsEqual(bearer, secret) || secretsEqual(alt, secret);
}

function secretsEqual(provided: string, secret: string) {
  if (!provided || provided.length !== secret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!authorizeTick(request)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const limited = await rateLimit("automation-tick", 60, 60_000);
  if (!limited.ok) return Response.json({ ok: false, error: "rateLimit" }, { status: 429 });
  const result = await processDueJobs();
  return Response.json({ ok: true, ...result });
}

export function GET() {
  return new Response("Method Not Allowed", { status: 405 });
}
