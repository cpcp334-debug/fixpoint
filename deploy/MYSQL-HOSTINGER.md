# Hostinger MySQL production (force conversion from Neon Postgres)

**Approved path:** Prisma `provider = "mysql"` · Hostinger MySQL · Neon → MySQL ETL · no destructive seed on production · Neon left intact.

## What changed in code

| Area | Change |
|------|--------|
| `prisma/schema.prisma` | `provider = "mysql"`, single `DATABASE_URL` (no `directUrl`) |
| `prisma/migrations/` | Single baseline `20260917220000_mysql_init` (old Postgres SQL archived under `prisma/migrations_postgres_archive/`) |
| Prisma queries | Removed `mode: "insensitive"` (MySQL `utf8mb4_unicode_ci` is typically case-insensitive) |
| Revision immutability | App-level in `src/lib/service-location/revisions.ts`; optional SQL trigger file in migration folder |
| Runtime | `mysql2` dependency; production `db-env` requires `mysql://` |

## 1. Create MySQL on Hostinger

hPanel → **Databases** → **MySQL Databases** → create database + user with full privileges.

Copy **Connect** details (do not commit them):

```
Host:     (often something like *.mysql.hostinger.com)
Port:     3306
Database:
Username:
Password: (keep in password manager / Hostinger env only)
```

Build URL:

```
DATABASE_URL="mysql://USERNAME:PASSWORD@HOST:3306/DATABASE"
```

URL-encode special characters in the password (`@`, `#`, `%`, etc.).

## 2. Apply schema (empty DB)

From this repo, with the Hostinger URL set locally (or in a throwaway shell env — **never commit**):

```powershell
cd alnajah-aldaem
$env:DATABASE_URL="mysql://USER:PASS@HOST:3306/DB"
npx prisma migrate deploy
```

Optional hardening (revision snapshot immutability trigger):

```powershell
# After migrate deploy — run the companion SQL in Hostinger phpMyAdmin
# or: mysql CLI against Hostinger
# File: prisma/migrations/20260917220000_mysql_init/revision_immutable_trigger.sql
```

App code already only updates revision `status` to `superseded` (never mutates `snapshotJson`).

## 3. Import data from Neon (ETL)

**Do not** wipe Neon. **Do not** run `npm run db:seed` on production after import.

```powershell
$env:NEON_DATABASE_URL="postgresql://neondb_owner:...@....neon.tech/neondb?sslmode=require"
$env:DATABASE_URL="mysql://USER:PASS@HOST:3306/DB"
npm run db:export-neon-to-mysql
```

Script: `scripts/export-neon-to-mysql.ts`  
- Reads Neon via `pg`  
- Writes into MySQL via Prisma/`mysql2` in FK-safe order  
- Skips if MySQL already has rows unless `FORCE_MYSQL_IMPORT=1`

## 4. Web App env (Hostinger)

```
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"
SITE_URL="https://fixpoint.ae"
NODE_ENV=production
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
AUTOMATION_CRON_SECRET=...
HEALTH_CHECK_SECRET=...
DOWNLOAD_CSRF_SECRET=...
```

**Remove** any old `DIRECT_URL` / Neon `postgresql://` vars from the Web App.

Optional: `SKIP_PRISMA_MIGRATE=1` only if you already applied schema manually and want postdeploy to no-op.

## 5. Redeploy zip

```powershell
npx tsx scripts/build-hostinger-zip.ts
```

Upload `deploy/out/alnajah-aldaem-hostinger.zip` → Redeploy.

## 6. Verify

- `https://fixpoint.ae/en` and key public routes  
- `/admin` login  
- Spot-check service×location pages, DIY, blog  
- Confirm row counts roughly match Neon (~463k total across tables)

## Local development notes

| Path | Notes |
|------|--------|
| **Production / Hostinger** | `mysql://` only |
| **Local MySQL (Docker)** | Preferred for MySQL parity: set `DATABASE_URL=mysql://...`, then `npx prisma migrate deploy` |
| **`npm run pg`** | Legacy **Postgres/PGlite only** — deprecated for the MySQL production path. Do not use for Hostinger deploys. |

See `.env.example` for URL templates.

## What you must paste next

From Hostinger → Database → Connect, paste (chat or secrets channel):

1. Host  
2. Port (usually `3306`)  
3. Database name  
4. Username  
5. Password (or set `DATABASE_URL` yourself and only confirm host/db)

Then we can run migrate + ETL against Hostinger without touching Neon.
