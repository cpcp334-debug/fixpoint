# Disaster recovery (ALNAJAH ALDAEM)

This document is the production **backup and disaster-recovery** runbook.

**Honesty status (repository):**

| Capability | Status |
|------------|--------|
| Automated PostgreSQL backups | **NOT CONFIGURED** · **REQUIRES EXTERNAL PROVIDER** |
| Point-in-time recovery (PITR) | **NOT CONFIGURED** · **REQUIRES EXTERNAL PROVIDER** (enable where provider supports) |
| Private upload object storage | **NOT CONFIGURED** · **REQUIRES EXTERNAL PROVIDER** (architecture decision: durable private object storage; app still uses local disk until a later migration) |
| Off-box backup vault | **NOT CONFIGURED** · **REQUIRES EXTERNAL PROVIDER** |
| Isolated restore drill | **NOT CONFIGURED** (documented below; **not** marked passed) |
| Backup monitoring / alerts | **NOT CONFIGURED** · **REQUIRES EXTERNAL PROVIDER** |
| Same-server “backup dump” as the recovery system | **Forbidden** — do not treat app-disk copies as production backups |

Related:

- [production-database.md](./production-database.md) — Postgres setup, env validation, health check
- [README.md](../README.md) — seed safety, scripts

Never put real secrets (`DATABASE_URL`, API keys, passwords) in this file or in git.

---

## Locked recovery objectives

| Objective | Locked value | Meaning |
|-----------|--------------|---------|
| **RPO** | **≤ 1 hour** | Maximum acceptable data loss window |
| **RTO** | **≤ 4 hours** | Target time to restore service after a declared disaster |

Retention schedules (daily/weekly/monthly keep counts) remain **TBD** until a PostgreSQL hosting provider is selected (**Provider TBD**).

Backup verification cadence: **TBD** (must be frequent enough to support RPO ≤ 1 hour once configured).

---

## Data inventory (source of truth)

### A. PostgreSQL (all persisted business data)

Backup of the production database must cover every Prisma model, including:

| Domain | Models |
|--------|--------|
| Catalog / content | `ServiceCategory`(+I18n), `Service`(+I18n), `Location`(+I18n), `ServiceLocation`(+I18n), `DiyCategory`(+I18n), `DiyGuide`(+I18n), `DiyVote`, `Article`(+I18n), `Project`(+I18n), `Faq`(+I18n) |
| CRM / ops | `Customer`, `Property`, `Lead`, `LeadScore`, `LeadScoreHistory`, `Booking`, `Inspection`, `WorkOrder`, `AmcContract` |
| Finance | `Quote`, `QuoteItem`, `Invoice`, `InvoiceItem`, `Payment`, `PricingRule`, `NumberSequence` |
| Trust | `Review`, `ReviewVote`, `ReviewInsight`, `Question`, `ContentReport` |
| Staff / auth | `User`, `Session`, `Staff`, `StaffSkill`, `Subcontractor` |
| Public AI | `AiConversation`, `MediaAsset` (metadata + `storageKey`) |
| Staff AI | `StaffAiConversation`, `StaffAiProposal`, `StaffAiDailyUsage` |
| Knowledge | `KnowledgeDocument`, `KnowledgeDocumentRevision` |
| Automation | `AutomationRule`, `AutomationJob`, `AutomationRun`, `OpsTask`, `AdminNotification` |
| Analytics | `Visitor`, `VisitSession`, `AnalyticsEvent` |
| Governance | `AuditLog`, `ExportLog`, `SiteSetting` |

**Status:** data lives in Postgres when production is provisioned · **backup NOT CONFIGURED** · **REQUIRES EXTERNAL PROVIDER**.

### B. Files / objects

| Asset | Current app location | Production target |
|-------|----------------------|-------------------|
| Private AI photos | `uploads/private/ai/...` + `MediaAsset.storageKey` | Durable **private** object storage (**REQUIRES EXTERNAL PROVIDER**; code migration later) |
| Booking photos | `uploads/private/bookings/...` | Same |
| Review photos | `uploads/private/reviews/...` + `Review.photoKey` | Same |
| Quote / invoice / export PDFs | Generated in memory (`pdfkit`); not stored on disk | Regenerate from restored DB — no separate PDF archive required |
| Static marketing SVGs | `public/*.svg` in git / deploy artifact | Redeploy from VCS |

**Status:** upload durability **NOT CONFIGURED** · **REQUIRES EXTERNAL PROVIDER**.

### C. Configuration / deployment

| Asset | Recover from | Status |
|-------|--------------|--------|
| Environment / secrets | Secrets manager / sealed ops vault | **NOT CONFIGURED** · **REQUIRES EXTERNAL PROVIDER** |
| Prisma migrations | git `prisma/migrations` | In VCS (not a data backup) |
| Application code | git / CI artifact | In VCS |
| Automation cron | External scheduler + `AUTOMATION_CRON_SECRET` | **NOT CONFIGURED** · **REQUIRES EXTERNAL PROVIDER** |
| Health check secret | Secrets manager (`HEALTH_CHECK_SECRET`) | **REQUIRES EXTERNAL PROVIDER** |
| DNS / TLS | Registrar / cert provider | **REQUIRES EXTERNAL PROVIDER** |
| Object storage IAM / keys | Secrets manager (separate from DB URL) | **REQUIRES EXTERNAL PROVIDER** |

---

## Backup strategy

### 1. PostgreSQL — Provider TBD

**REQUIRES EXTERNAL PROVIDER.** Do not hard-code a cloud vendor in this repo until hosting is selected.

When configured, production must provide:

1. **Automated backups** on a schedule that supports **RPO ≤ 1 hour** (typically continuous WAL / PITR, or snapshots at least hourly).
2. **Retention** — exact keep counts **TBD** after provider selection.
3. **PITR** — enable where the provider supports it (strongly preferred for RPO ≤ 1 hour and accidental deletion).
4. **Encrypted backup storage** (provider encryption at rest + access control).
5. **Off-box vault** — backups must not live only on the application server.
6. **Restore verification** — periodic isolated restore drill (see below). **NOT** claimed passed until actually performed.

Forbidden as the production strategy:

- Copying database files onto the same app server and calling that “backup”
- Relying on PGlite / local Docker Compose for production recovery
- `prisma migrate reset`, `db:push:dev`, or destructive production seed as “recovery”

Production schema apply path remains: **`prisma migrate deploy`** (`npm run db:migrate`).

### 2. Uploads — durable private object storage (decision locked)

**Architecture decision:** Option A — durable private object storage.

| Item | Status |
|------|--------|
| Decision documented | Yes (this file) |
| Provider / bucket provisioned | **NOT CONFIGURED** · **REQUIRES EXTERNAL PROVIDER** |
| Application code migrated off local disk | **Not in this fix** — remains local `uploads/private` until a separate storage migration |
| Object versioning / soft-delete | Recommended when provider is selected — **TBD** |
| Privacy after restore | Objects stay private; serve only via existing authenticated / tokenized routes — never public ACLs |

Restore uploads independently of Postgres, then confirm `storageKey` / `photoKey` paths still resolve.

### 3. Generated documents (PDFs)

Quote, invoice, and list-export PDFs are **ephemeral**. After DB restore, regenerate via admin PDF/export routes. No independent PDF backup store is required.

### 4. Configuration / secrets

Store production env in a secrets manager (**REQUIRES EXTERNAL PROVIDER**). Document *names* of required variables (see `.env.example`); never store values in git.

### 5. Deployment / migrations

- Migrations: recover from git history; apply with `prisma migrate deploy` only.
- Application: redeploy last known-good build.
- Do not use `npm run db:push:dev` in production.

---

## Security model for backups

When a provider is configured:

- Least-privilege access to backup vault (separate from app runtime DB credentials).
- Encryption at rest where the provider supports it.
- Protection against accidental deletion / immutability where available.
- Audit access to backups where the provider supports it.
- **Never** embed `DATABASE_URL`, API keys, or passwords in scripts or documentation.
- Verification tooling must not log secrets.

**Status:** controls **NOT CONFIGURED** until provider + IAM exist · **REQUIRES EXTERNAL PROVIDER**.

---

## Monitoring requirements (design)

Alert when configured:

- Backup job failure
- Backup age exceeding **RPO (1 hour)**
- Storage capacity pressure
- Restore-drill overdue or failed

**Status:** **NOT CONFIGURED** · **REQUIRES EXTERNAL PROVIDER**.

---

## Isolated restore drill

**Never** restore-test against the live production database.

**Status of last drill:** **NOT CONFIGURED** / **not passed** (no isolated restore has been recorded in this repository).

### Procedure

1. Select a backup or PITR timestamp (provider console).
2. Restore into an **isolated** PostgreSQL instance (separate project / credentials).
3. Configure a throwaway environment pointing at that instance (never prod `DATABASE_URL`).
4. Run `npx prisma migrate status`. Apply `npx prisma migrate deploy` only if intentionally catching the schema up.
5. Verify critical table presence and spot-check counts/rows (customers, leads, bookings, quotes, invoices, work orders, payments, users).
6. Confirm app connectivity; call `GET /api/internal/health/db` with `HEALTH_CHECK_SECRET`.
7. Smoke: staff login, open one lead/quote, regenerate one PDF.
8. If upload objects are in scope: restore private objects from object-storage backup; open one private photo route; confirm still private.
9. Record: backup age, restore duration vs **RTO ≤ 4 hours**, pass/fail. Do **not** mark passed in docs unless the drill was actually performed.

---

## Scenario playbooks

### 1. Database corruption

| | |
|--|--|
| Recover | Full Postgres restore (latest good backup or PITR) |
| From | Provider backup vault · **REQUIRES EXTERNAL PROVIDER** |
| Procedure | Stop writes → restore isolated/new instance → migrate status/deploy if needed → cut over `DATABASE_URL` → health check → smoke |
| App files | Unchanged if only DB corrupt |

### 2. Accidental data deletion

| | |
|--|--|
| Recover | PITR to before deletion, or restore snapshot + selective export if provider allows |
| From | PITR / snapshot · **REQUIRES EXTERNAL PROVIDER** |
| Procedure | Prefer PITR; validate row presence on isolated instance before cutover |

### 3. Failed migration

| | |
|--|--|
| Recover | Pre-migrate DB backup + known-good app build; forward-fix when possible |
| From | DB backup + git migrations |
| Procedure | Stop traffic → restore DB if schema inconsistent → deploy known-good → `migrate deploy` only with reviewed migration · never `migrate reset` / `db:push:dev` / destructive seed |

### 4. Application server failure

| | |
|--|--|
| Recover | Application process / host |
| From | git/CI + process manager · DB assumed intact |
| Procedure | Redeploy → confirm env validation at startup → health check |

### 5. Upload storage failure

| | |
|--|--|
| Recover | Private objects |
| From | Object-storage backup / versioning · **REQUIRES EXTERNAL PROVIDER** |
| Procedure | Restore bucket/prefix → verify keys match DB → smoke private media routes · DB may be intact |

### 6. Credential compromise

| | |
|--|--|
| Recover | Secrets + session integrity |
| From | Secrets manager · DB `Session` invalidation |
| Procedure | Rotate `DATABASE_URL` password, `AUTOMATION_CRON_SECRET`, `HEALTH_CHECK_SECRET`, `OPENAI_API_KEY`, admin passwords, object-storage keys → invalidate staff sessions → audit `AuditLog` · **REQUIRES EXTERNAL PROVIDER** for vault/IAM |

### 7. Complete environment / server loss

| | |
|--|--|
| Recover | Host + DB + uploads + secrets + DNS/TLS + cron |
| From | All external providers |
| Procedure | New host → restore Postgres → restore private objects → restore secrets → redeploy app → DNS/TLS → recreate cron → health + smoke within **RTO ≤ 4 hours** target |

### 8. Automation queue loss

| | |
|--|--|
| Recover | `AutomationRule`, `AutomationJob`, `AutomationRun`, `OpsTask`, notifications |
| From | Database backup (queue is DB-backed) |
| Procedure | Restore DB → recreate external cron to `/api/internal/automation/tick` with rotated secret if needed |

### 9. AI provider outage

| | |
|--|--|
| Recover | Service availability (not historical chat blobs from OpenAI) |
| From | N/A — app failsafe when `OPENAI_API_KEY` empty/unavailable |
| Procedure | Wait for provider; confirm failsafe behavior; no DB restore required for outage alone |

### Supporting recoveries

| Topic | Notes |
|-------|--------|
| Migration recovery | git history + `prisma migrate deploy` only |
| Secret recovery | Secrets manager · never from git |
| DNS / TLS recovery | Registrar / cert provider · **REQUIRES EXTERNAL PROVIDER** |
| Cron recovery | Recreate scheduler job; secret ≥ 16 chars |
| Private object restoration | Restore to private bucket/prefix; keep ACLs private |

---

## Pre-production clone checklist (local test data)

**Do not auto-delete.** Review before cloning any local DB toward production:

- Leads with test-like names (historically: `Test Customer`, `Cleanup Quote`, `2F1 Verify`, `2F1 NoCookie`, etc.)
- Test phone numbers used in verifies
- Pending automation jobs; confirm rules should stay disabled until intentional enablement
- Local super-admin identity vs production admin identity
- Local `uploads/private/ai/*` test photos and matching `MediaAsset` rows
- Analytics / verify-script leftovers

Re-run a live inventory at cutover time — counts change.

---

## Emergency contacts (placeholders)

| Role | Contact |
|------|---------|
| Primary technical owner | **TBD** |
| Backup / hosting provider support | **TBD** (after provider selection) |
| DNS / TLS owner | **TBD** |
| Business escalation | **TBD** |

---

## Repository verification

```bash
npm run verify:dr-readiness
npm run verify:db-env
npm run verify:seed-safety
```

These checks validate documentation honesty and safety invariants. They do **not** perform a restore and do **not** claim backups exist.

---

## What remains outside this repository

1. Select PostgreSQL host (**Provider TBD**) and enable automated backups + PITR sufficient for **RPO ≤ 1 hour**.
2. Set retention policy (**TBD**).
3. Provision private object storage and (later) migrate the app off local disk.
4. Secrets manager, monitoring, DNS, TLS, cron.
5. Perform and record an **isolated** restore drill; only then mark it passed.
6. Review/purge local test data before any production data migration.
