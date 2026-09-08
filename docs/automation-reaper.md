# Automation stale-running reaper (FIX 7)

## Problem

If a worker crashes mid-job, `AutomationJob` can stay `running` forever. The tick only claims `pending` / `failed`, so those jobs never retry.

## Lease field

- `AutomationJob.startedAt` set when a job is atomically claimed (`pending`/`failed` → `running`)
- Cleared on terminal transitions: `succeeded`, `failed`, `dead`
- Index: `(status, startedAt)`

## Reaper

Invoked at the **start** of the existing secret-protected tick (`processDueJobs` → `POST /api/internal/automation/tick`).

No new scheduler.

### Env

| Variable | Default | Minimum |
|---|---|---|
| `AUTOMATION_STALE_RUNNING_MINUTES` | 15 | 5 |

### When a running job is stale

Atomic update (status must still be `running` and `startedAt` ≤ cutoff):

- `status` → `pending`
- `runAt` → now
- `startedAt` → null
- `lastError` → `stale_running_reaped`
- **does not** increment `attempt` (next real process does)

Never reaps recent running jobs, or `pending` / `failed` / `succeeded` / `dead`.

### Audit

`AuditLog` only (no `AutomationRun` stub):

- `action`: `automation.job.reaped`
- `entity`: `AutomationJob`
- `meta`: `{ "reason": "stale_running" }` only (no phone, email, IP, UA, fingerprint, transcript, photos, or full requirements)

## Verify

```bash
npm run verify:automation-reaper
```
