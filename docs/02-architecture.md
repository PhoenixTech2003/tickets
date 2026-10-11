# 2. Architecture

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, `cacheComponents`, `partialPrefetching`, React Compiler, Turbopack) |
| Database | Neon Postgres via Drizzle ORM (`drizzle-orm/neon-serverless`, WebSocket pool for transactions) |
| Auth | Neon Auth, which is managed Better Auth (`@neondatabase/auth`). Google is the only provider. Roles come from the admin plugin. |
| Realtime + offline | PowerSync Cloud with `@powersync/web`, `@powersync/react` and `@powersync/drizzle-driver` |
| UI | shadcn/ui (Radix), Tailwind v4, lucide icons, sonner toasts, next-themes |
| PDF | `pdf-lib`, rendered on the server in a route handler |

## Folder layout

```
src/
├── app/                      # Routes only: thin pages that compose components
│   ├── page.tsx              # Landing (static shell + session-aware CTA)
│   ├── sign-in/              # Google sign-in
│   ├── continue/             # Post-login router: sends each role to its home
│   ├── pending/              # "Awaiting access" for plain users
│   ├── dashboard/            # Admin + organizer workspace (PowerSync-backed)
│   │   ├── events/[eventId]/ # Event workspace (entrances, tickets, scanners…)
│   │   └── users/            # Admin-only people & roles (Next cache)
│   ├── scan/                 # The scanning page (all a ticket_scanner sees)
│   └── api/
│       ├── auth/[...path]/   # Neon Auth proxy
│       ├── powersync/token/  # Issues PowerSync JWTs
│       ├── powersync/upload/ # Receives the PowerSync upload queue
│       └── events/[eventId]/tickets/download/  # zip of A4 ticket PDFs
├── server/                   # Everything server-side ("server-only")
│   ├── auth/                 # Neon Auth instance, viewer DAL, permissions, roles
│   ├── actions/              # Server Actions (all mutations except scans)
│   ├── queries/              # Cached server reads
│   ├── db/                   # Drizzle client, schema, migrations
│   ├── powersync/            # Token signing, upload handler, sync-streams.yaml
│   ├── tickets/              # PDF renderer
│   └── scripts/              # make-admin
├── lib/                      # Isomorphic + client libraries
│   ├── powersync/            # Client schema, db singleton, connector, provider, live queries, scan
│   ├── tickets.ts            # Code generation + verification (shared client/server)
│   ├── roles.ts, verdicts.ts, format.ts, auth-client.ts
├── components/
│   ├── ui/                   # shadcn/ui primitives (generated)
│   └── app/                  # Feature components built from shadcn primitives
└── proxy.ts                  # Optimistic auth gate (Next 16's renamed middleware)
```

## Data flow

```
                ┌──────────── Server Actions (create/update/delete, RBAC-checked) ──────────┐
                │                                                                            ▼
Browser ── UI ──┤                                                                      Neon Postgres
  ▲             │                                                                            │
  │             └── scans: local SQLite write ─► PowerSync upload queue ─► /api/powersync/upload ─┘
  │                                                                            (re-verified)
  │                                                                                          │
  └──── live queries (useQuery) ◄── local SQLite ◄── PowerSync Service ◄── logical replication
```

- **Reads** for event data come from the PowerSync SQLite copy in the browser. Every screen updates live: ticket counts, the activity feed, new entrances, scanner changes.
- **Writes** for managing events go through Server Actions. Each one checks permissions with the viewer's role, read fresh from `neon_auth.user`, then writes to Postgres, and PowerSync replicates the change to every relevant device within about a second. Doing writes on the server keeps every authorization rule there.
- **Scans** are the exception. They have to work offline, so they are written to local SQLite and uploaded by PowerSync when online. The server re-verifies each one before it counts. See [PowerSync](./05-powersync.md).
- **Admin user management** isn't part of the synced data. It is read on the server through Next's `use cache` (see [Caching](./07-caching.md)).
