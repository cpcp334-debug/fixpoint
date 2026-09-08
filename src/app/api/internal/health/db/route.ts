import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/server/db";
import { rateLimit } from "@/server/rate-limit";

const MIN_SECRET_LEN = 16;

export function healthSecretConfigured() {
  const secret = process.env.HEALTH_CHECK_SECRET || "";
  return secret.length >= MIN_SECRET_LEN;
}

export function authorizeHealthCheck(request: Request) {
  const secret = process.env.HEALTH_CHECK_SECRET || "";
  if (secret.length < MIN_SECRET_LEN) return false;
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const alt = request.headers.get("x-health-secret") || "";
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

/**
 * Authenticated operational DB ping.
 * Returns only safe status fields — never connection strings, hosts, or driver errors.
 */
export async function GET(request: Request) {
  if (!authorizeHealthCheck(request)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const limited = await rateLimit("health-db", 120, 60_000);
  if (!limited.ok) {
    return Response.json({ ok: false, error: "rateLimit" }, { status: 429 });
  }

  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      ok: true,
      db: "up",
      latencyMs: Date.now() - started,
    });
  } catch {
    return Response.json(
      {
        ok: false,
        db: "down",
        latencyMs: Date.now() - started,
      },
      { status: 503 },
    );
  }
}

export function POST() {
  return new Response("Method Not Allowed", { status: 405 });
}
