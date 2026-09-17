# ALNAJAH ALDAEM

Next.js App Router site for ALNAJAH ALDAEM (public marketing + internal admin).

## Local development

```bash
npm install
# Prefer Docker/local MySQL 8 with DATABASE_URL=mysql://... (see .env.example)
npx prisma migrate deploy
npm run db:seed    # NON-PRODUCTION only — destructive catalog wipe
npm run dev
```

`npm run pg` (PGlite Postgres on 127.0.0.1:5433) is **legacy / deprecated** for the Hostinger MySQL path — schema provider is now `mysql`.

## Production database (Hostinger MySQL)

Use **Hostinger MySQL** in production. See **[deploy/MYSQL-HOSTINGER.md](deploy/MYSQL-HOSTINGER.md)**.

Quick path:

1. Create MySQL DB on Hostinger; set `DATABASE_URL=mysql://...`
2. `npx prisma migrate deploy`
3. One-time Neon → MySQL ETL: `npm run db:export-neon-to-mysql` (needs `NEON_DATABASE_URL`)
4. `npm run build` && `npm start` (or upload Hostinger zip)
5. **Do not** run destructive `db:seed` after import

Production startup validates `DATABASE_URL` and requires `mysql://` (refuses PGlite / accidental local DB URLs). `next build` does not require a live production database.

## Database seeding (important)

Seeding is **environment-gated**. Destructive wipe (mass `deleteMany` of customers, leads, bookings, quotes, invoices, work orders, payments, reviews, questions, automation jobs/rules, AMC, catalog, etc.) is:

| Environment | Default `npm run db:seed` |
|-------------|---------------------------|
| `NODE_ENV` ≠ `production` | Full catalog wipe + reseed (development) |
| `NODE_ENV=production` | **SAFE bootstrap only** — refuses destructive wipe |

### Production-safe seed (default when `NODE_ENV=production`)

Runs only:

- optional staff `super_admin` upsert (`ADMIN_EMAIL` / `ADMIN_PASSWORD`, min 12 chars)
- disabled example automation rules (upsert)
- template INTERNAL SOPs (upsert)

It does **not** delete operational or catalog data.

```bash
NODE_ENV=production npm run db:seed
# or explicitly:
SEED_STAFF_ONLY=1 npm run db:seed
```

`SEED_STAFF_ONLY=1` skips the development wipe path in any environment. It is **not** sufficient by itself as the production guard — production already defaults to safe bootstrap.

### Emergency destructive override (never routine)

Only for disaster recovery on a disposable/production clone when you intentionally need a full wipe:

```bash
NODE_ENV=production \
ALLOW_DESTRUCTIVE_PRODUCTION_SEED=I_UNDERSTAND_DELETE_ALL_OPERATIONAL_DATA \
npm run db:seed
```

Do **not** set that override in normal deploys or CI.

### Verification

```bash
npm run verify:dr-readiness
npm run verify:db-env
npm run verify:seed-safety
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run db:migrate` | `prisma migrate deploy` (production-safe) |
| `npm run db:seed` | Seed (mode depends on `NODE_ENV`) |
| `npm run db:setup` | Local generate + migrate + seed |
| `npm run db:push:dev` | **Development only** — `prisma db push`; never use for production schema |
| `npm run build` / `npm start` | Production build / start |
| `npm run verify:dr-readiness` | Backup/DR documentation honesty checks (does not claim backups exist) |
| `npm run verify:db-env` | Production DATABASE_URL / env safety checks |
| `npm run verify:seed-safety` | Destructive seed refusal checks |
| `npm run verify:rate-limit` | Durable rate limits + trusted proxy |
| `npm run verify:security-headers` | CSP/HSTS + admin download CSRF |

## Environment

See `.env.example` for required production vs optional variables (`DATABASE_URL`, `SITE_URL`, `ADMIN_*`, `AUTOMATION_CRON_SECRET`, `HEALTH_CHECK_SECRET`, `OPENAI_API_KEY`, etc.).
