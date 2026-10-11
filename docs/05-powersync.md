# 5. PowerSync

PowerSync keeps a SQLite copy of each user's event data in the browser, using OPFS or IndexedDB through wa-sqlite in a web worker. Every dashboard and scanner screen reads from that copy with live queries, so the UI updates in realtime and the scanner keeps working offline.

## Client

| File | Role |
|---|---|
| `src/lib/powersync/schema.ts` | Drizzle SQLite tables → `DrizzleAppSchema`. Booleans arrive as `0/1`, timestamps as text. |
| `src/lib/powersync/db.ts` | Per-user singleton. **One database file per user** (`tickets-<userId>.db`), so a shared door tablet never mixes accounts. Workers load from `/@powersync/worker.js`. |
| `src/lib/powersync/connector.ts` | `fetchCredentials()` → `GET /api/powersync/token`. `uploadData()` → `POST /api/powersync/upload`. Both authenticate with the session cookie. |
| `src/lib/powersync/provider.tsx` | Client-only provider. PowerSync needs browser APIs, so the subtree renders only after hydration, with a skeleton until then. |
| `src/lib/powersync/queries.ts` | Live hooks: `useQuery(toCompilableQuery(drizzleQuery))` |
| `src/lib/powersync/scan.ts` | Offline ticket verification and the local `scans` insert |

Worker assets are copied into `public/@powersync` by the `postinstall` script (`powersync-web copy-assets -o public`). That folder is git-ignored.

Signing out calls `disconnectAndClear()`, which wipes the local copy before the session ends.

## Tokens: `/api/powersync/token`

The server signs its own **HS256 JWT** (`src/server/powersync/token.ts`) instead of reusing the Neon Auth JWT:

- `sub` is the Neon Auth user id.
- `role` is the admin-plugin role, read fresh from the database.
- `aud` is `POWERSYNC_URL`, and the token expires after 5 minutes.

The Neon Auth JWT can't carry custom claims, but the sync streams need the `role` claim to give admins the full data set. PowerSync recommends this pattern: the backend sets the role claim, so users can't escalate their own privileges. The short expiry means a role change reaches sync within minutes.

## Sync Streams: `src/server/powersync/sync-streams.yaml`

| Stream | Who | Data |
|---|---|---|
| `admin_everything` | `auth.parameter('role') = 'admin'` | every row of all seven tables |
| `organizer_events` | events in `event_organizers` for `auth.user_id()` | the event, entrances, organizers, scanners, batches, tickets, scans |
| `scanner_events` | events in `event_scanners` (not disabled) for `auth.user_id()` | event, entrances, tickets, **own** scans, own assignments |

All three use `auto_subscribe: true`. Disabling a scanner removes that event from their stream, so the event disappears from their device.

## Writes

- **Everything except scans** goes through Server Actions (`src/server/actions/*`), straight to Postgres, and comes back through replication. Mutations stay authoritative and RBAC-checked on the server.
- **Scans** are written locally, so they work offline, and uploaded by PowerSync.

### Upload handler: `src/server/powersync/upload.ts`

1. Only `PUT` on `scans` is accepted. Anything else is rejected per row, so it can't block the queue.
2. `canScanAt(viewer, station)` must pass.
3. The server re-runs `verifyTicket()` against Postgres. This is the same function the device ran, from `src/lib/tickets.ts`.
4. Redemption is a conditional update: `UPDATE tickets SET redeemed_at … WHERE id = $1 AND redeemed_at IS NULL`.
5. The scan is inserted with the server's verdict in `result` and the device's verdict in `client_result`. A retried upload is a no-op (`ON CONFLICT (id) DO NOTHING`).

### Offline conflicts

Two offline devices might both admit the same code. The first upload wins. The second becomes `already_used`, and that row syncs back to its device. The event's **Live activity** tab shows these overruled scans as "device said admitted".

## PowerSync Dashboard setup

1. **Database connection:** use the Neon direct connection string with the `powersync_role` user (see [Setup](./09-setup-and-environment.md#neon)).
2. **Client Auth:** add an **HS256** key. The key id is `POWERSYNC_JWT_KID` and the secret is `POWERSYNC_JWT_SECRET` (base64url). Set **JWT Audience** to the exact `POWERSYNC_URL`.
3. **Sync Streams:** paste `src/server/powersync/sync-streams.yaml`, then **Validate** and **Deploy**.

## Sync status page

`/dashboard/sync` (dashboard users) and `/scan/sync` (scanners) render the same view, `src/components/app/sync/sync-status-view.tsx`. It follows PowerSync's [usage examples](https://docs.powersync.com/client-sdks/usage-examples) and [production readiness guide](https://docs.powersync.com/maintenance-ops/production-readiness-guide), which recommend an in-app view of client diagnostics.

| Section | Source | Guidance followed |
|---|---|---|
| Status hero | `deriveSyncState()` in `src/lib/powersync/diagnostics.ts` | Indicator precedence: **errors → connecting → offline → uploading/downloading → connected** |
| Download progress | `status.downloadProgress` (`SyncProgress` component) | Hidden when there's no progress to report. Shows "Applying server-side changes…" when downloaded = total operations. Also shown on the scanner while the first sync is running. |
| Diagnostic flags | `connected`, `connecting`, `dataFlowStatus.uploading/downloading`, `hasSynced`, `lastSyncedAt` | The fields the readiness guide lists for a diagnostics view |
| Upload queue | `db.getUploadQueueStats(true)` (row count + size of `ps_crud`), polled every 2 s | Monitor upload-queue length |
| Current errors | `dataFlowStatus.downloadError` / `uploadError` | Surface sync errors |
| Session log | `attachDiagnostics()` registered in the provider | Each **distinct** error is logged once, because the status re-emits an error until it clears. Connection changes and the first full sync are logged too, and errors also go to `console.error`. |
| Sync streams | `status.syncStreams`: name, auto/explicit, synced or progress, last synced | Per-stream status |
| On this device | Row counts of the local SQLite tables | Shows what offline scanning will check against |

Actions on the page:

- **Reconnect** runs `disconnect()` then `connect()`.
- **Re-download** runs `disconnectAndClear()` then `connect()`. Its confirmation warns when the upload queue isn't empty, because clearing would drop unsent scans.

The sync pill in the sidebar and the scanner header uses the same state logic and links to this page.
