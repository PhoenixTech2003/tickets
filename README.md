# Tickets

Create events, map entrances, print two-up A4 ticket sheets, and scan at the door. Scanning keeps working offline, and guests at the wrong entrance are redirected by name.

**Stack:** Next.js 16 (Cache Components) · Neon Postgres + Neon Auth (managed Better Auth, Google only, admin-plugin roles) · Drizzle · PowerSync · shadcn/ui · bun

- Setup and environment variables: [docs/09-setup-and-environment.md](docs/09-setup-and-environment.md)
- All implementation docs: [docs/README.md](docs/README.md)

```bash
bun install
cp .env.example .env.local
bun run db:migrate
bun dev
bun run make-admin you@gmail.com
```
