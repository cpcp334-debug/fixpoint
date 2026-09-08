# Production database (ALNAJAH ALDAEM)

This document describes how to run the app against **real PostgreSQL** in production.
It does **not** claim that backups, monitoring, or cloud infrastructure are already configured.

Related:

- Seed safety: root [README.md](../README.md)
- Backup / disaster recovery (RPO/RTO, restore drills, scenarios): **[disaster-recovery.md](./disaster-recovery.md)**

## Environment separation

| Environment | Database |
|-------------|----------|
| Development | PGlite (`npm run pg` on `127.0.0.1:5433`) **or** optional Docker Compose Postgres (`docker-compose.yml`, labeled development-only) |
| Production | **Real PostgreSQL only** |

PGlite must never be used in production. Production startup refuses:

- missing `DATABASE_URL`
- localhost / `127.0.0.1` / `::1` (unless `ALLOW_PRODUCTION_LOCAL_DB=1`)
- PGlite default port `5433` (always refused, even with the override)
- PGlite query fingerprint `pgbouncer=true` **and** `connection_limit=1` (always refused)

Validation runs at **application startup** via `src/instrumentation.ts` (`next start` / Node runtime).
`next build` does **not** require a live production database (`NEXT_PHASE=phase-production-build` skips the assert).
Seed/scripts may still connect with a local URL when intentionally testing bootstrap under `NODE_ENV=production`; the Next.js process itself will refuse unsafe production URLs.

Never log `DATABASE_URL` or credentials. Use rejection **reason codes** only.

## Required production setup flow

1. **Provision PostgreSQL** (managed or self-hosted). Not PGlite. Not Compose defaults. **Provider TBD.**
2. **Configure environment** (secrets manager / host env — not committed files):
   - `NODE_ENV=production`
   - `DATABASE_URL` — real Postgres URL (typically `sslmode=require`)
   - `SITE_URL` — public HTTPS origin
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — for optional safe bootstrap only
   - `AUTOMATION_CRON_SECRET` — min 16 chars
   - `HEALTH_CHECK_SECRET` — min 16 chars (dedicated; do not reuse the cron secret)
   - `OPENAI_API_KEY` — or accept AI failsafe when empty
3. **Generate client + apply migrations** (no `db push` in production):

```bash
npx prisma generate
NODE_ENV=production npx prisma migrate deploy
```

4. **Safe bootstrap** (optional; does **not** wipe operational data — see Fix 1):

```bash
NODE_ENV=production ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:seed
```

5. **Verify schema** (provider console / `prisma migrate status`) and smoke-test the health endpoint.
6. **Start the application** (`npm run build` then `npm start`, or your process manager).
7. **Configure backups / DR** per [disaster-recovery.md](./disaster-recovery.md) before treating the environment as launch-ready.

### Forbidden in production

- `npm run db:push:dev` / `prisma db push` — development schema sync only
- `prisma migrate reset`
- Destructive seed (blocked by default; see README seed section)
- Starting `npm run pg` (PGlite)
- Depending on `docker-compose.yml` default passwords
- Treating same-server disk copies as the production backup system

## Prisma

- Provider: `postgresql` (`prisma/schema.prisma`)
- Production schema changes: **`prisma migrate deploy`** only (`npm run db:migrate`)
- Client: `prisma generate` (also via `postinstall` / `build`)
- Do not invent ad-hoc destructive migrations for routine deploys

## Connection pooling

Do **not** copy the local PGlite URL parameters into production.

| Context | Guidance |
|---------|----------|
| Local PGlite | `pgbouncer=true&connection_limit=1` on port `5433` — **dev only** |
| Single Node process | Direct Postgres URL; Prisma’s pool is usually enough |
| Reverse proxy / long-lived Node | Keep one PrismaClient per process (existing `src/server/db.ts` pattern) |
| Multi-instance / serverless | Use the provider’s pooler (e.g. PgBouncer / Neon / RDS Proxy). `pgbouncer=true` alone on a **remote** pooler host is valid. Never combine with `connection_limit=1` the way the PGlite recipe does |
| Future scale-out | Prefer external pooler + sized `connection_limit` appropriate to instance count; measure under load |

Exact pool sizes are **TBD** per hosting plan.

## Health check

`GET /api/internal/health/db`

- Requires `HEALTH_CHECK_SECRET` (Bearer or `x-health-secret`), minimum 16 characters
- Does **not** use `AUTOMATION_CRON_SECRET`
- Response (safe fields only): `{ ok, db: "up"|"down", latencyMs? }` or `401` / `429` / `503`
- Never returns connection strings, hosts, or driver error text

Example:

```bash
curl -sS -H "Authorization: Bearer $HEALTH_CHECK_SECRET" https://YOUR_HOST/api/internal/health/db
```

## Backup and disaster recovery (summary)

Full detail: **[disaster-recovery.md](./disaster-recovery.md)**.

| Item | Locked / status |
|------|-----------------|
| **RPO** | **≤ 1 hour** |
| **RTO** | **≤ 4 hours** |
| PostgreSQL automated backups | **NOT CONFIGURED** · **REQUIRES EXTERNAL PROVIDER** (Provider TBD) |
| PITR | **NOT CONFIGURED** · enable where provider supports |
| Backup retention | **TBD** until provider selected |
| Private uploads | Architecture: durable **private object storage**; provision **NOT CONFIGURED** · **REQUIRES EXTERNAL PROVIDER**; app code still local-disk until a later migration |
| Isolated restore drill | Documented · **NOT CONFIGURED** / **not passed** |
| Same-server dump as backup system | **Forbidden** |

### Database backup requirements (when you configure the provider)

- Automated backups supporting RPO ≤ 1 hour
- Encrypted, access-controlled, off-box storage
- PITR where available
- Periodic isolated restore verification

### Upload durability

- Production target: private object storage (separate from the database backup)
- Restore objects privately; do not expose public ACLs
- Quote/invoice PDFs are regenerated from DB — not archived as files

### Migration recovery

- Prefer forward-fix migrations; avoid rewriting applied history on production.
- If `migrate deploy` fails mid-way: stop traffic, inspect provider logs, restore from backup if schema is inconsistent, then retry with a known-good build.
- Never recover production with `db:push:dev`, `migrate reset`, or destructive seed.

### Application recovery

- Redeploy last known-good build artifact.
- Confirm env validation passes at startup.
- Confirm health check and critical admin paths.

## Verification (local, non-destructive)

```bash
npm run verify:dr-readiness
npm run verify:db-env
npm run verify:seed-safety
```

These scripts must not reset the local business database and must not claim a restore drill passed.

## Still required externally

- Managed/self-hosted PostgreSQL provisioning (**Provider TBD**)
- TLS, strong unique credentials, secrets manager
- Automated DB backups + PITR + retention + restore drills
- Private object storage (+ later app migration off local disk)
- Monitoring / alerting (backup age vs RPO, failures)
- Reverse proxy, HTTPS, cron for automation tick
