# 7. Caching (Cache Components) vs PowerSync

`next.config.ts` enables `cacheComponents` and `partialPrefetching`. The rule of thumb used: **anything that must be realtime comes from PowerSync on the client. Next's caches are used only where data is static or changes on deliberate admin action.**

| Surface | Strategy | Why |
|---|---|---|
| Landing `/` | Static shell prerendered. Only `<SessionCta>` streams behind `<Suspense>`. | Marketing content never changes per request |
| `/sign-in` | Fully static | No request data |
| `/continue`, `/pending` | Session read behind `<Suspense>` | Must reflect the current role |
| `/dashboard/**`, `/scan/**` | **Fully static** shells with a client gate (see [Auth](./04-auth-and-rbac.md)). Data comes from **PowerSync live queries**. Event pages take the id as `?id=` so one shell serves every event. | Realtime counters, activity feed, offline scanning. A server cache would only add staleness. |
| `/dashboard/users` | `"use cache"` + `cacheTag("users")` + `cacheLife("minutes")` in `src/server/queries/users.ts` | The directory isn't synced to clients and changes rarely. Authorization runs **outside** the cached scope, so the cache can't be reached without it. |
| Role changes, scanner add/remove | `updateTag("users")` in the Server Action | Read-your-own-writes: the admin sees the new role immediately |
| Session/role reads | React `cache()` per request, never `"use cache"` | Roles must apply immediately and the session reads cookies |

Server Actions don't call `revalidatePath` for event data. PowerSync pushes the change to every open screen, including other people's.

## Instant-navigation validation

Next 16.4 checks in development that each page can render a UI immediately on navigation. Every page under `/dashboard` and `/scan` exports `instant = false`, because their layouts render children only inside `PowerSyncProvider`, which renders nothing below it on the server. Without the opt-out, the dev overlay reports "Could not validate that a segment in your UI has instant navigation". Navigation between these pages is still immediate: the layout and its gate persist, and the pages read from the local SQLite copy.

## Navigation and offline

- **Navigation:** the dashboard and scan layouts and pages read no request data, so they prerender, and Partial Prefetching prefetches each one in full. Moving between pages needs no server round trip. `/dashboard/users` is the exception: its list streams from the server.
- **`experimental.useOffline`:** a navigation or Server Action that fails offline waits and retries when the connection returns. `OfflineFallback` (`src/components/app/offline-fallback.tsx`) uses the `useOffline` hook to explain the wait on the People page.
- **Service worker (`public/sw.js`):** registered in production after the gate confirms a signed-in viewer, as `/sw.js?v=<build id>` (`NEXT_PUBLIC_BUILD_ID` in `next.config.ts`), so each deploy installs a fresh worker and drops the old caches.

| Request | Strategy |
|---|---|
| Page loads of the dashboard and scan shells | Precached on install, then network-first (3 s timeout) with cache fallback. Keyed by path, since the shells don't vary by query. |
| `/_next/static/*` | Cache-first (hashed, immutable) |
| Router prefetches (`rsc` + `next-router-prefetch` / `next-router-segment-prefetch`) | Network-first, cached by full URL. `_rsc` hashes the varying headers, so the URL is a safe key. |
| Other static files (PowerSync worker and WASM, icons) | Stale-while-revalidate |
| `/api/*`, non-prefetch RSC requests | Network only, never cached: they carry per-user data |
| Any other page while offline | A small offline page that sends signed-in devices to their home screen |

A device must sign in online once to cache the viewer and the shells. After that, reloads and navigation work offline. Old URLs `/dashboard/events/:id[/edit]` redirect to the new `?id=` pages.

