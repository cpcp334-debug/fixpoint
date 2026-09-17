# Neon → Hostinger database migration

> **SUPERSEDED (2026-09-17):** Production is now **Hostinger MySQL** (`provider = "mysql"`).  
> Do **not** follow this Postgres dump/restore guide. Use **[MYSQL-HOSTINGER.md](./MYSQL-HOSTINGER.md)** instead.

~~Prisma was `provider = "postgresql"`.~~ The app now targets MySQL; Postgres dumps (`*.dump` / `neon-to-hostinger.sql`) must **not** be imported into Hostinger MySQL.

---

## Legacy notes (Postgres-only path — archived)

**App stays on Hostinger Next.js Web App.** Only the database URL should change — if and only if the target is **PostgreSQL**.

Prisma (`prisma/schema.prisma`) is **`provider = "mysql"`** as of the force-MySQL conversion. A Hostinger **MySQL** database is the production target; use the MySQL guide above.

---

## Verdict (read this first) — historical

| What Hostinger shows | Can you leave Neon with a simple restore? |
|----------------------|-------------------------------------------|
| **PostgreSQL** (VPS Postgres, Docker Postgres, or any `postgresql://` Connect string) | **Yes** — restore dump, then point Web App env at it |
| **MySQL / MariaDB only** (typical Web Apps “Database” — host often `*.mysql.hostinger.com`, port `3306`, `mysql://`) | **No** — do **not** import this dump. Keep **Neon** (or another Postgres), or provision **Hostinger VPS Postgres** / external Postgres (Neon/Supabase/etc.) |

### Official Hostinger position (summary)

- **Web / Cloud / managed Web Apps:** managed DB is **MySQL**. PostgreSQL is **not** offered on those plans.
- **PostgreSQL on Hostinger:** requires **VPS** (install yourself or one-click Postgres / Docker / Supabase template).
- Web Apps can still connect the Next.js app to an **external** Postgres URL (Neon, Supabase, VPS Postgres) via env vars.

So: “move DB to Hostinger” on a **Next.js Web App alone** usually means **MySQL blocker**, not a `pg_restore` target.

---

## What is ready on this PC

Fresh export **from Neon DIRECT** (prefer these over older `alnajah-full.*`):

| File | Purpose |
|------|---------|
| `deploy/out/neon-to-hostinger.dump` | Custom format for `pg_restore` (preferred) — fresh from Neon DIRECT |
| `deploy/out/neon-to-hostinger.sql` | Plain SQL derived from that dump, cleaned of PG18-only `SET transaction_timeout` and `\restrict` / `\unrestrict` |

Rebuild (from Neon DIRECT — do not commit credentials):

```powershell
cd "C:\Users\Asus Ultra 9\Desktop\website alnajah al daem\alnajah-aldaem"

$env:PGPASSWORD = "YOUR_NEON_PASSWORD"   # or put password in URL
.\deploy\tools\pgsql18\bin\pg_dump.exe `
  --format=custom --no-owner --no-acl `
  -f ".\deploy\out\neon-to-hostinger.dump" `
  "postgresql://USER:PASSWORD@ep-XXXX.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

---

## What you must paste from Hostinger → Database → Connect

Open the **fixpoint.ae** Web App → **Database** → **Connect** and fill:

```
Engine:          (PostgreSQL  |  MySQL / MariaDB)
Host:
Port:
Database:
Username:
```

(Password: prefer setting only in Hostinger env — do not commit.)

### How to tell Postgres vs MySQL from Connect

| Signal | Likely engine |
|--------|----------------|
| Port `5432` (or `6432` pooler), URL starts with `postgresql://` / `postgres://` | **PostgreSQL** → proceed with restore |
| Port `3306`, URL starts with `mysql://`, host like `*.mysql.hostinger.com` | **MySQL** → **stop**; keep Neon or get Postgres elsewhere |

---

## Path A — Hostinger (or VPS) PostgreSQL available

### 1. Env format for the Next.js Web App (you set these in hPanel — this doc does not change them)

If Hostinger Postgres has **no separate pooler**, set both to the same URL:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
```

If you later add PgBouncer / a pooler host:

```
DATABASE_URL="postgresql://USER:PASSWORD@POOLER_HOST:PORT/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_HOST:PORT/DATABASE?sslmode=require"
```

Also keep (unchanged purpose):

```
SITE_URL="https://fixpoint.ae"
NODE_ENV=production
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
AUTOMATION_CRON_SECRET=...
HEALTH_CHECK_SECRET=...
DOWNLOAD_CSRF_SECRET=...
```

Optional after a full dump restore (schema already present):

```
SKIP_PRISMA_MIGRATE=1
```

**Do not** use local PGlite URLs. **Do not** run `db:seed` after restore.

### 2. Restore template (`pg_restore` from this PC)

```powershell
cd "C:\Users\Asus Ultra 9\Desktop\website alnajah al daem\alnajah-aldaem"

$env:PGPASSWORD = "YOUR_HOSTINGER_OR_VPS_POSTGRES_PASSWORD"

.\deploy\tools\pgsql18\bin\pg_restore.exe `
  --host=YOUR_HOST `
  --port=YOUR_PORT `
  --username=YOUR_USER `
  --dbname=YOUR_DATABASE `
  --clean --if-exists --no-owner --no-acl `
  --verbose `
  ".\deploy\out\neon-to-hostinger.dump"
```

Plain SQL alternative (large file; use if UI/SSH expects `.sql`):

```powershell
$env:PGPASSWORD = "YOUR_HOSTINGER_OR_VPS_POSTGRES_PASSWORD"
.\deploy\tools\pgsql18\bin\psql.exe `
  --host=YOUR_HOST --port=YOUR_PORT --username=YOUR_USER --dbname=YOUR_DATABASE `
  -f ".\deploy\out\neon-to-hostinger.sql"
```

### 3. Cut over

1. Confirm restore finished without fatal errors.
2. In Hostinger Web App env, switch `DATABASE_URL` / `DIRECT_URL` to the Hostinger/VPS Postgres URLs (formats above).
3. Redeploy / restart the Web App.
4. Smoke-check `https://fixpoint.ae/en`, `/faq`, `/blog`, `/diy`, `/admin`, and DB health if configured.
5. Only then stop relying on Neon (and rotate the Neon password that was shared in chat).

---

## Path B — Hostinger only offers MySQL (blocker)

**Do not** run `pg_restore` / import `neon-to-hostinger.sql` into MySQL. It will fail; Prisma will not work.

Options that actually work:

1. **Keep Neon** as production Postgres (current pattern: Hostinger Next.js + Neon `DATABASE_URL`).
2. **Hostinger VPS** with Postgres (or Docker Postgres / Supabase-on-VPS), then follow **Path A**.
3. Another managed Postgres (Neon stay, Supabase, RDS, etc.) and point Hostinger env at it.

There is **no** safe one-click “Neon dump → Hostinger MySQL” conversion for this codebase.

---

## Security

- A Neon password was shared in chat / agent context. **Rotate that Neon password** in the Neon console after migration work, then update any env that still uses Neon.
- Do not commit connection strings or dump files with secrets into git.
- Prefer pasting Hostinger Connect fields without the password; set password only in hPanel env.

---

## Related

- Deploy zip / upload notes: [HOSTINGER.md](./HOSTINGER.md)
- Production DB rules: [../docs/production-database.md](../docs/production-database.md)
