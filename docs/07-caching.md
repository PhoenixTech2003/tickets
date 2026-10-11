# 7. Caching (Cache Components) vs PowerSync

`next.config.ts` enables `cacheComponents` and `partialPrefetching`. The rule of thumb used: **anything that must be realtime comes from PowerSync on the client. Next's caches are used only where data is static or changes on deliberate admin action.**

| Surface | Strategy | Why |
|---|---|---|
| Landing `/` | Static shell prerendered. Only `<SessionCta>` streams behind `<Suspense>`. | Marketing content never changes per request |
| `/sign-in` | Fully static | No request data |
| `/continue`, `/pending` | Session read behind `<Suspense>` | Must reflect the current role |
| `/dashboard/**`, `/scan` | Server gate (session + role) behind `<Suspense>`. Data comes from **PowerSync live queries**. | Realtime counters, activity feed, offline scanning. A server cache would only add staleness. |
| `/dashboard/users` | `"use cache"` + `cacheTag("users")` + `cacheLife("minutes")` in `src/server/queries/users.ts` | The directory isn't synced to clients and changes rarely. Authorization runs **outside** the cached scope, so the cache can't be reached without it. |
| Role changes, scanner add/remove | `updateTag("users")` in the Server Action | Read-your-own-writes: the admin sees the new role immediately |
| Session/role reads | React `cache()` per request, never `"use cache"` | Roles must apply immediately and the session reads cookies |

Server Actions don't call `revalidatePath` for event data. PowerSync pushes the change to every open screen, including other people's.

## Instant-navigation validation

Next 16.4 checks in development that each page can render a UI immediately on navigation. Every page under `/dashboard` and `/scan` exports `instant = false`, because their layouts render children only inside `PowerSyncProvider`, which renders nothing below it on the server. Without the opt-out, the dev overlay reports "Could not validate that a segment in your UI has instant navigation". Navigation between these pages is still immediate: the layout and its gate persist, and the pages read from the local SQLite copy.
