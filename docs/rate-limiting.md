# Rate limiting and trusted proxy (FIX 5)

Durable, shared rate limits for ALNAJAH ALDAEM. Limits are enforced only on
API / Server Action endpoints that already had rate limiting — **not** on public SSR pages.

Related: staff account lockout remains in Fix 4 (`AuthLoginGuard`) and is separate.

## Status

| Component | Status |
|-----------|--------|
| Store | PostgreSQL `RateLimitBucket` |
| Redis | Not used |
| In-memory Map | Removed for production durability |

## Existing limits (unchanged)

| Endpoint / area | Logical key prefix | Limit | Window |
|-----------------|-------------------|-------|--------|
| Staff login | `staff-login:{ip}` | 8 | 15 min |
| Public AI chat | `ai:{ip}` | 20 | 10 min |
| AI uploads | `ai-upload:{ip}` | 10 | 10 min |
| Leads | `lead:{ip}` | 5 | 10 min |
| Bookings | `booking:{ip}` | 5 | 10 min |
| Q&A | `qa:{ip}` | 5 | 60 min |
| Reviews | `review:{ip}` | 3 | 60 min |
| Review votes | `review-vote:{ip}:{id}` | 5 | 60 min |
| Content reports | `report:{ip}` | 8 | 60 min |
| DIY votes | `vote:{ip}:{id}` | 5 | 60 min |
| Analytics `/api/t` | `t:{ip}` | 60 | 10 min |
| Co-Founder chat burst | `cofounder:{userId}` | 30 | 10 min |
| Co-Founder proposals list | `cofounder-proposals:{userId}` | 60 | 10 min |
| Co-Founder proposal writes | `cofounder-proposal-write:{userId}` | 40 | 10 min |
| Automation tick | `automation-tick` | 60 | 1 min |
| Health DB | `health-db` | 120 | 1 min |

Also preserved (not `RateLimitBucket`):

- **AuthLoginGuard** — per-account lockout (5 / 15 min defaults)
- **Co-Founder daily cap** — 100/day Asia/Dubai via `StaffAiDailyUsage`

## Storage privacy

`RateLimitBucket.keyHash` = SHA-256 of the logical key string.

Never store raw IP, email, phone, passwords, or transcripts in this table.
Rows also hold only `count`, `resetAt`, and `updatedAt`.

## Trusted proxy

| Setting | Meaning |
|---------|---------|
| `TRUST_PROXY` unset or not `1` | **Ignore** `X-Forwarded-For` and `X-Real-IP` → client IP `"unknown"` |
| `TRUST_PROXY=1` **and** `TRUSTED_PROXY_HOPS=N` (N≥1) | Take the **N-th address from the right** of `X-Forwarded-For` |

Never trust the leftmost `X-Forwarded-For` value blindly.

Example behind a single reverse proxy that appends the connecting client:

```bash
TRUST_PROXY=1
TRUSTED_PROXY_HOPS=1
```

Development typically leaves `TRUST_PROXY` unset so local spoofed headers cannot bypass limits by faking a unique IP per request (all share `"unknown"` unless you explicitly enable trust for proxy tests).

## Failure modes

| Class | Store unavailable |
|-------|-------------------|
| Security-critical (login, AI, uploads, forms, Co-Founder burst, automation, health) | **Fail closed** → treat as rate limited |
| Analytics `/api/t` | **Fail open** → allow ingest (body size limits still apply) |

## TTL / cleanup

Each bucket has `resetAt` at the end of its fixed window. Expired windows reset on next hit.
Opportunistic prune deletes rows with `resetAt` in the past (every ~50 checks).

## Verification

```bash
npm run verify:rate-limit
```
