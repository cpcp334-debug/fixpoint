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
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

**AI chat:** `OPENAI_API_KEY` is required for the public Fixpoint AI widget (`/api/ai/chat`). Create a key at https://platform.openai.com/api-keys , paste it into Hostinger Environment Variables, then Redeploy. Empty/missing key → failsafe “not configured” reply.

**Remove** any Neon `postgresql://` / `DIRECT_URL` vars.

**Build note:** `npm run build` is `prisma generate && next build` only. Schema is applied with `prisma migrate deploy` (or postdeploy). Data comes from Neon→MySQL ETL — **do not** run `db:seed` after import.

## Upload steps

1. Create Hostinger MySQL DB and set `DATABASE_URL`.
2. `npx prisma migrate deploy` (and optional revision trigger — see MYSQL-HOSTINGER.md).
3. Run `npm run db:export-neon-to-mysql` with `NEON_DATABASE_URL` + Hostinger `DATABASE_URL`.
4. Upload `alnajah-aldaem-hostinger.zip` → Redeploy.
5. Verify `https://fixpoint.ae/en`, `/faq`, `/blog`, `/diy`, `/admin`.

Legacy Postgres dump docs (`HOSTINGER-DB-MIGRATE.md`, `*.dump` / `*.sql`) are obsolete for this MySQL path — do not import Postgres dumps into MySQL.

## Performance / redirects (PageSpeed Mobile)

Hostinger diagnostics often score **0** on redirects + document latency even when the Next app is lean.

### Panel settings (do these once)

1. **Force HTTPS** — enable in Hostinger Websites → fixpoint.ae → SSL / HTTPS.
2. **www → non-www (apex)** — redirect `www.fixpoint.ae` → `https://fixpoint.ae` at the panel/DNS level when available. The app middleware also 301s www→apex as a backup; panel-level is one fewer hop for `http://www`.
3. **Do not** add a panel rule that sends `/` → `/en` (the app **rewrites** apex `/` to EN with **zero** `Location` header).
4. Prefer the Node app region closest to UAE visitors (or enable Hostinger CDN / edge cache for static).

### What the app already does

| Request | Expected |
|---------|----------|
| `https://fixpoint.ae/` | **200** HTML (internal rewrite → EN) — no `Location` |
| `https://fixpoint.ae/en` | **200** |
| `https://www.fixpoint.ae/*` | **301** → `https://fixpoint.ae/*` |
| `http://*` | **301** → HTTPS (panel / hcdn) |

### Honest ceiling

`x-hcdn-upstream-rt` ~250ms on HTML is **Hostinger TTFB**. Gzip/brotli for `/_next/static` is on; long `Cache-Control` for `/_next/static` and `/media/*` is set in `next.config.ts`. If Mobile still fails **Document request latency** after Redeploy with **0 redirects** on apex, treat further gains as CDN/region — not missing app redirects.
