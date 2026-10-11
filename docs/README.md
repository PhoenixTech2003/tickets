# Tickets: implementation docs

Event ticketing with offline-capable door scanning. These docs follow the order the project was built in.

| # | Stage | What it covers |
|---|-------|----------------|
| 0 | [Spec](./spec.md) | The original brief |
| 1 | [Decisions](./01-decisions.md) | Clarifications agreed before building, and the defaults chosen |
| 2 | [Architecture](./02-architecture.md) | Stack, folder layout, how data moves |
| 3 | [Database](./03-database.md) | Drizzle schema, migrations, the `neon_auth` read model |
| 4 | [Auth & RBAC](./04-auth-and-rbac.md) | Neon Auth, Google OAuth, admin-plugin roles, permission matrix |
| 5 | [PowerSync](./05-powersync.md) | Sync Streams, tokens, the upload path, offline conflict handling |
| 6 | [Tickets & scanning](./06-tickets-and-scanning.md) | Code format, verification rules, A4 PDF layout |
| 7 | [Caching](./07-caching.md) | Where Cache Components are used and where PowerSync is used instead |
| 8 | [Design system](./08-design-system.md) | shadcn/ui theme, tokens, typography, ticket motifs |
| 9 | [Setup & environment](./09-setup-and-environment.md) | Every env var, where it comes from, and the first-run checklist |

## Commands

```bash
bun install            # also copies PowerSync worker assets into public/@powersync
bun run db:migrate     # apply drizzle migrations (tables + PowerSync publication)
bun run make-admin you@gmail.com   # after your first Google sign-in
bun run typecheck
bun run lint
```
