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
| Build | `prisma migrate deploy` runs **before** `next build` so empty Hostinger MySQL gets tables during deploy |
| Catalog prerender | Soft-fails to empty lists if tables/data missing (avoids P2021 crash on first build) |

## 1. Create MySQL on Hostinger

hPanel → **Databases** → **MySQL Databases** → create database + user with full privileges.

Copy **Connect** details (do not commit them):

```
Host:     (on the Web App: usually localhost; remote import: auth-db*.hstgr.io — see § Remote)
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

### Web App env (same server) — use localhost

```
DATABASE_URL="mysql://u134444654_fixpoint:PASSWORD@localhost:3306/u134444654_fixpoint"
```

### Remote access from your PC (for migrate/ETL from Windows)

1. hPanel → **Databases** → **Remote MySQL** (or MySQL → Remote access)
2. Add your public IP (or `%` temporarily), save
3. Hostname is typically `auth-dbXXXX.hstgr.io` (copy from Connect / Remote MySQL — **not** `localhost`)
4. From PC:

```
DATABASE_URL="mysql://u134444654_fixpoint:PASSWORD@auth-dbXXXX.hstgr.io:3306/u134444654_fixpoint"
```

Without Remote MySQL whitelist, login fails with `Access denied ... @'YOUR.IP'`.

## 2. Apply schema (empty DB)

**Preferred on Hostinger:** Redeploy — `npm run build` now runs `prisma migrate deploy` first, which creates all tables against `localhost` MySQL.

From this repo with a **remote** Hostinger URL (after Remote MySQL is enabled):

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

### From your PC (after Remote MySQL works)

```powershell
$env:NEON_DATABASE_URL="postgresql://neondb_owner:...@....neon.tech/neondb?sslmode=require"
$env:DATABASE_URL="mysql://USER:PASS@auth-dbXXXX.hstgr.io:3306/DB"
# Fast bootstrap (skip ~124k ServiceLocation rows); then re-run without PRIORITY for full SL:
$env:MYSQL_IMPORT_PRIORITY="1"
npm run db:export-neon-to-mysql
```

### On Hostinger (no Remote MySQL needed)

Set Web App env temporarily, then Redeploy (postdeploy runs import when opted in):

```
RUN_MYSQL_IMPORT=1
MYSQL_IMPORT_PRIORITY=1
NEON_DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
DATABASE_URL=mysql://USER:PASS@localhost:3306/DB
```

After import finishes, **remove** `RUN_MYSQL_IMPORT`, `NEON_DATABASE_URL`, and `MYSQL_IMPORT_PRIORITY` from Hostinger env. Re-run later without `MYSQL_IMPORT_PRIORITY` (and with `FORCE_MYSQL_IMPORT=1` if Service rows already exist) to load the SL corpus.

Script: `scripts/export-neon-to-mysql.ts`  
- Reads Neon via `pg`  
- Writes into MySQL via `mysql2` in FK-safe order  
- Skips if MySQL already has Service rows unless `FORCE_MYSQL_IMPORT=1`

## 4. Web App env (Hostinger)

```
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/DATABASE"
SITE_URL="https://fixpoint.ae"
NODE_ENV=production
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
AUTOMATION_CRON_SECRET=...
HEALTH_CHECK_SECRET=...
DOWNLOAD_CSRF_SECRET=...
```

**Remove** any old `DIRECT_URL` / Neon `postgresql://` vars from the Web App (except temporary `NEON_DATABASE_URL` for ETL).

Optional: `SKIP_PRISMA_MIGRATE=1` only if you already applied schema manually and want migrate to no-op.

## 5. Redeploy zip / Git

```powershell
npx tsx scripts/build-hostinger-zip.ts
```

Upload `deploy/out/alnajah-aldaem-hostinger.zip` → Redeploy  
— or push `main` if Hostinger is connected to GitHub.

## 6. Verify

- `https://fixpoint.ae/en` and key public routes  
- `/admin` login  
- Spot-check service×location pages, DIY, blog  
- Confirm row counts roughly match Neon (~460 services, ~454 DIY, ~908 articles, then SL if imported)

## Local development notes

| Path | Notes |
|------|--------|
| **Production / Hostinger** | `mysql://` only |
| **Local MySQL (Docker)** | Preferred for MySQL parity: set `DATABASE_URL=mysql://...`, then `npx prisma migrate deploy` |
| **`npm run pg`** | Legacy **Postgres/PGlite only** — deprecated for the MySQL production path. Do not use for Hostinger deploys. |

See `.env.example` for URL templates.

## What you must paste next (if PC import is blocked)

From Hostinger → Database → Connect / Remote MySQL:

1. Confirm Remote MySQL allows your IP (or `%`)
2. Host (e.g. `auth-db1344.hstgr.io`)
3. Port `3306`
4. Then we run migrate + ETL from this PC

Until then: Redeploy with localhost `DATABASE_URL` (migrate-during-build creates tables). Site may be empty until Neon import runs.
