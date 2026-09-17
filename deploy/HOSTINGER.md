# Hostinger deploy (fixpoint.ae) — MySQL + zip upload

**Production database:** Hostinger **MySQL** (Prisma `provider = "mysql"`).  
Full steps: **[MYSQL-HOSTINGER.md](./MYSQL-HOSTINGER.md)**

## Ready on your PC

| File | Purpose |
|------|---------|
| `deploy/out/alnajah-aldaem-hostinger.zip` | Code zip for Hostinger Web App upload |
| `deploy/MYSQL-HOSTINGER.md` | Create MySQL DB → migrate → Neon ETL → redeploy |

Rebuild zip:

```powershell
cd alnajah-aldaem
npm run zip:hostinger
# or: npx tsx scripts/build-hostinger-zip.ts
```

## Paste from Hostinger → Databases → MySQL → Connect

```
Host:
Port: 3306
Database:
Username:
Password: (prefer Hostinger env only)
```

Production Web App env:

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

**Remove** any Neon `postgresql://` / `DIRECT_URL` vars.

**Build note:** `npm run build` is `prisma generate && next build` only. Schema is applied with `prisma migrate deploy` (or postdeploy). Data comes from Neon→MySQL ETL — **do not** run `db:seed` after import.

## Upload steps

1. Create Hostinger MySQL DB and set `DATABASE_URL`.
2. `npx prisma migrate deploy` (and optional revision trigger — see MYSQL-HOSTINGER.md).
3. Run `npm run db:export-neon-to-mysql` with `NEON_DATABASE_URL` + Hostinger `DATABASE_URL`.
4. Upload `alnajah-aldaem-hostinger.zip` → Redeploy.
5. Verify `https://fixpoint.ae/en`, `/faq`, `/blog`, `/diy`, `/admin`.

Legacy Postgres dump docs (`HOSTINGER-DB-MIGRATE.md`, `*.dump` / `*.sql`) are obsolete for this MySQL path — do not import Postgres dumps into MySQL.
