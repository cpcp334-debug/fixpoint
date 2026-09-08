# Quote service/location foreign keys (FIX 8)

## Relations

| Field | Target | Optional | onDelete | onUpdate |
|---|---|---|---|---|
| `Quote.serviceId` | `Service.id` | yes | **Restrict** | Cascade |
| `Quote.locationId` | `Location.id` | yes | **Restrict** | Cascade |

Indexes on `serviceId` / `locationId` already existed; no duplicates added.

Denormalized `serviceLabel` / `locationLabel` remain the historical display source. Quotes are never cascade-deleted when a catalog row is removed — deletion of a referenced service/location is blocked instead.

## Application validation

`createQuote` / `updateQuote` (`src/lib/admin/quotes.ts`):

- `""` / whitespace → `null`
- non-null ID must exist; otherwise typed error `invalid_service` or `invalid_location`
- never coerce invalid IDs to null
- Co-Founder `sourceKey` idempotency and forced `DRAFT` unchanged

## Migration safety

Migration `20260908094000_fix8_quote_service_location_fk`:

1. Counts orphan non-empty refs; **raises** if any
2. Normalizes empty-string IDs to `NULL`
3. Adds FK constraints

```bash
npm run verify:quote-fk-orphan   # gate before migrate
npm run db:migrate
npm run verify:quote-fk
```
