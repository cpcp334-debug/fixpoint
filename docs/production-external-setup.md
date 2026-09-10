# Production external setup (honest checklist)

**Repository status:** application code is ready for controlled coverage + publication.  
**External status:** **NOT CONFIGURED** / **EXTERNAL_REQUIRED** until credentials and ops wiring exist.

| Dependency | Status | What owner/devops must provide |
|------------|--------|--------------------------------|
| Managed PostgreSQL | EXTERNAL_REQUIRED | Non-localhost `DATABASE_URL`, pooling, SSL |
| Object storage | EXTERNAL_REQUIRED | Real S3-compatible client + bucket credentials (current `STORAGE_PROVIDER=s3` is stub) |
| Backups / PITR | EXTERNAL_REQUIRED | Provider backups meeting RPO ≤1h / RTO ≤4h ([disaster-recovery.md](./disaster-recovery.md)) |
| Monitoring / alerts | EXTERNAL_REQUIRED | Hook into `pipeline-metrics` + host APM/uptime |
| Cron / automation tick | EXTERNAL_REQUIRED | Scheduler calling internal automation with `AUTOMATION_CRON_SECRET` |
| DNS | EXTERNAL_REQUIRED | Production hostname → deploy target |
| HTTPS | EXTERNAL_REQUIRED | TLS terminator / platform HTTPS |
| Production secrets | EXTERNAL_REQUIRED | Secrets manager for DB, admin bootstrap, cron, health, AI keys |

Related: [production-database.md](./production-database.md), [object-storage.md](./object-storage.md), [disaster-recovery.md](./disaster-recovery.md).

## What the app already does
- Refuses unsafe production DB URLs at startup
- Local storage adapter for private uploads
- Content generation queue with retry/reaper/idempotency
- Controlled coverage + single-pair publish with audit
- Sitemap shards only for published+indexable+covered

## What the app will not do
- Invent operational coverage for all 62,200 pairs
- Mass-publish or mass-index
- Fabricate image binaries or claim S3 is live without credentials
