# Security headers and admin download CSRF (FIX 6)

## Content-Security-Policy

| Environment | Header |
|-------------|--------|
| Production (`NODE_ENV=production`) | **Enforced** `Content-Security-Policy` |
| Development | **Report-Only** `Content-Security-Policy-Report-Only` |

Policy (no `*` wildcards):

- `default-src 'self'`
- `script-src 'self' 'unsafe-inline'` (+ GA hosts only if `NEXT_PUBLIC_GA_ID` is set)
- `style-src 'self' 'unsafe-inline'`
- `font-src 'self'` (next/font self-hosted)
- `img-src 'self' data: blob:` (+ optional GA)
- `connect-src 'self'` (+ optional GA)
- `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`

## HSTS

Sent **only** when:

- `NODE_ENV=production`, and
- `SITE_URL` starts with `https://`

Never on localhost or non-HTTPS `SITE_URL`.

Value: `max-age=31536000; includeSubDomains`

## Admin export / PDF downloads

Cookie-authenticated **GET** downloads are disabled (CSRF risk with `SameSite=Lax` top-level navigations).

| Route | GET | POST |
|-------|-----|------|
| `/api/admin/exports` | **405** | Auth + RBAC + CSRF + file |
| `/api/admin/quotes/[id]/pdf` | **405** | Auth + quotes RBAC + CSRF + PDF |
| `/api/admin/invoices/[id]/pdf` | **405** | Auth + invoices RBAC + CSRF + PDF |

CSRF:

- HMAC token via `DOWNLOAD_CSRF_SECRET` (min **32** characters)
- Bound to authenticated staff user id
- TTL **15 minutes**
- Additive rejection of `Sec-Fetch-Site: cross-site` and mismatched `Origin`
- **Fail closed** in production if secret missing
- Never log the secret

Public review photos / AI upload GETs are unchanged (not staff export CSRF scope).

## Configuration

```bash
# Required for admin PDF/export downloads (production fail-closed if missing)
DOWNLOAD_CSRF_SECRET="replace-with-a-long-random-secret-at-least-32-chars"

# HSTS requires production + HTTPS site URL
# SITE_URL="https://www.example.com"
```

## Verification

```bash
npm run verify:security-headers
```
