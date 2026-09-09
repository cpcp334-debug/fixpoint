# Object storage (private uploads)

**Status: NOT CONFIGURED**

This repository does **not** ship a working S3 (or S3-compatible) client. The default adapter writes to local disk under `uploads/private`. Selecting `STORAGE_PROVIDER=s3` without a real implementation throws a clear "not configured" error — do **not** treat env placeholders as proof that object storage is live.

Related: [disaster-recovery.md](./disaster-recovery.md) (private upload durability also **NOT CONFIGURED** / **REQUIRES EXTERNAL PROVIDER**).

## Current behavior

| Provider | Env | Behavior |
|----------|-----|----------|
| `local` (default) | `STORAGE_PROVIDER=local` or unset | Files under `uploads/private` (optional `LOCAL_STORAGE_ROOT`) |
| `s3` | `STORAGE_PROVIDER=s3` | Stub only — throws until a real client is implemented **and** credentials exist |

API: `getStorage()` in `src/lib/storage` (`putObject`, `getObjectUrl`, `deleteObject`, `exists`).

## Required env vars (when a real provider is wired later)

Comment-only placeholders live in `.env.example`. Do not commit secrets.

| Variable | Purpose |
|----------|---------|
| `STORAGE_PROVIDER` | `local` (default) or `s3` |
| `LOCAL_STORAGE_ROOT` | Optional local root (default `uploads/private`) |
| `OBJECT_STORAGE_PROVIDER` | Provider label (TBD) |
| `OBJECT_STORAGE_BUCKET` | Private bucket name |
| `OBJECT_STORAGE_REGION` | Region |
| `OBJECT_STORAGE_ACCESS_KEY_ID` | Access key (secrets manager only) |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | Secret key (secrets manager only) |
| `OBJECT_STORAGE_ENDPOINT` | Optional custom endpoint (S3-compatible) |
| `OBJECT_STORAGE_FORCE_PATH_STYLE` | Optional `true`/`false` for path-style hosts |

## Honesty checklist

- [ ] Do **not** claim S3 is configured in runbooks or status dashboards while this stub remains.
- [ ] Do **not** set fake `OBJECT_STORAGE_*` values in production to silence errors.
- [ ] Local `uploads/private` is **not** a durable backup target (see disaster-recovery.md).
