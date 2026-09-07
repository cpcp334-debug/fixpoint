import { mkdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = Number(process.env.PG_PORT || 5433);
const host = "127.0.0.1";
const dataDir = path.join(process.cwd(), "prisma", "pgdata");

await mkdir(dataDir, { recursive: true });

const db = await PGlite.create({ dataDir });
const server = new PGLiteSocketServer({
  db,
  port,
  host,
  maxConnections: 64,
});

server.addEventListener("error", (event) => {
  const detail = "detail" in event ? event.detail : event;
  process.stderr.write(`PGlite connection error (ignored): ${detail}\n`);
});

await server.start();
process.stdout.write(`PGlite PostgreSQL listening on ${host}:${port}\n`);

process.on("uncaughtException", (err) => {
  const code = "code" in err ? err.code : "";
  if (code === "ECONNRESET" || code === "EPIPE" || code === "ECONNREFUSED") {
    process.stderr.write(`PGlite ignored ${code}\n`);
    return;
  }
  throw err;
});

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
