# 3. Database

Schema: `src/server/db/schema/app.ts`. Migrations: `src/server/db/migrations/`. Config: `drizzle.config.ts`.

## Tables (public schema)

| Table | Purpose | Notes |
|---|---|---|
| `events` | name, venue, starts/ends, `currency`, `disabled`, `created_by` | `currency` is an ISO 4217 code (default `MWK`) for ticket prices |
| `entrances` | per-event doors, `disabled` | Deleting one sets tickets/scanners to "any entrance" (`ON DELETE SET NULL`) |
| `event_organizers` | who manages an event | Creator stored with `is_owner = true`. Unique per (event, user) |
| `event_scanners` | scanner assignments | `entrance_id NULL` = roaming. Unique per (event, user) |
| `ticket_batches` | one generation run, the unit of printing | `price_minor` = optional price per ticket in the currency's minor unit (integer, no float rounding); `NULL` = no price |
| `tickets` | `code` (globally unique), `voided`, `redeemed_at/by/entrance` | |
| `scans` | append-only log of every attempt | `result` = server verdict, `client_result` = device verdict |

Design notes:

- Every table has a uuid `id` primary key, because PowerSync requires an `id` column.
- User names and emails are copied onto `event_organizers` and `event_scanners` when the row is created. That lets the client show people without syncing the auth schema. Names are a snapshot and don't change if the person later renames their Google account.
- Deleting an event cascades to everything under it. Logical replication carries the cascaded deletes to PowerSync.

## `neon_auth` (read model)

`src/server/db/schema/auth.ts` maps `neon_auth.user`, the table Neon Auth owns. Drizzle never migrates it: `schemaFilter: ["public"]` keeps `drizzle-kit` out of it. The app uses it to:

- read the admin plugin's `role` column as the source of truth for RBAC
- search people by name or email when adding scanners and organizers
- write the custom roles (see [Auth & RBAC](./04-auth-and-rbac.md#why-some-role-writes-bypass-the-plugin-api))

> The column names (`id`, `name`, `email`, `image`, `role`, `banned`, `createdAt`) follow Better Auth's defaults with the admin plugin. If your Neon Auth version differs, check with `\d neon_auth."user"` in psql and adjust `auth.ts`.

## Migrations

```bash
bun run db:generate   # after editing app.ts
bun run db:migrate    # applies to DATABASE_URL_UNPOOLED (falls back to DATABASE_URL)
bun run db:studio
```

### In CI

- **`.github/workflows/deploy.yml`** owns production deploys. On every push to `main` (or *Run workflow*), it runs `db:migrate` and then `vercel deploy --prod`. If the migration fails, nothing deploys. Runs are queued, never parallel. Secrets live in the `production` GitHub environment: `DATABASE_URL_UNPOOLED`, `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`.
- **`vercel.json`** turns off Vercel's own Git deploys for `main`, so the workflow is the only path to production. PR preview deploys are unchanged.
- **`.github/workflows/migrations-drift.yml`** fails a PR if `db:generate` would produce a migration that is not committed.

While a migration runs, the previous deploy is still live against the new schema. Adding tables and columns is safe. Dropping or renaming something takes two deploys: first stop using it, then remove it.

| Migration | Contents |
|---|---|
| `0000_init.sql` | All tables, indexes, FKs, the `scan_result` enum |
| `0001_powersync_publication.sql` | `CREATE PUBLICATION powersync FOR TABLE …` with the seven synced tables. Logical replication must be enabled in Neon first. |
| `0002_ticket_prices.sql` | Adds `events.currency` (default `MWK`) and the nullable `ticket_batches.price_minor` |
