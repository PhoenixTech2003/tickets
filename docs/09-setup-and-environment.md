# 9. Setup & environment

All variables go in **`.env.local`** at the project root, next to `package.json`. `.env.example` is the template. In production, set the same variables in your host's settings (e.g. Vercel → Project → Settings → Environment Variables). Every variable is **server-only** except `NEXT_PUBLIC_SITE_URL`, the public origin used for canonical URLs, Open Graph images and the sitemap.

| Variable | Where to get it | Used by |
|---|---|---|
| `DATABASE_URL` | Neon Console → Dashboard → **Connect** → *Pooled connection* | `src/server/db`, `make-admin` |
| `DATABASE_URL_UNPOOLED` | Same dialog with **Connection pooling off** (direct) | `drizzle-kit` migrations |
| `NEON_AUTH_BASE_URL` | Neon Console → **Auth** → Configuration → *Auth URL* | `src/server/auth` |
| `NEON_AUTH_COOKIE_SECRET` | Generate: `openssl rand -base64 32` (≥ 32 chars). App-only: it is **not** entered in Neon. | Signs the app's cached-session cookie |
| `POWERSYNC_URL` | PowerSync Dashboard → instance → **Connect** → instance URL | Token `aud` and the endpoint sent to clients |
| `POWERSYNC_JWT_SECRET` | Generate: `openssl rand 32 \| basenc --base64url \| tr -d '='` | Signs PowerSync tokens (HS256) |
| `POWERSYNC_JWT_KID` | Any id, e.g. `tickets` | JWT header `kid`. Must match PowerSync Client Auth. |
| `NEXT_PUBLIC_SITE_URL` | Your production origin, e.g. `https://tickets.example.com` (falls back to `VERCEL_PROJECT_PRODUCTION_URL`, then localhost) | SEO metadata, `robots.txt`, sitemap |

## First run

### Neon

1. Create a project and enable **Auth** on the branch (Console → Auth).
2. **Google OAuth:** Console → Settings → Auth → OAuth providers → Google. For development, Neon's shared credentials work immediately. For production, create a Google Cloud OAuth client (Web application) with:
   - redirect URI `{NEON_AUTH_BASE_URL}/callback/google`
   - your origins (e.g. `http://localhost:3000`) as authorized JavaScript origins

   Then paste the client ID and secret into Neon.
3. **Trusted domains:** add `http://localhost:3000` and your production origin in Auth → Configuration. Sign-in redirects back to `<origin>/continue`.
4. **Logical replication:** Settings → Logical Replication → **Enable**.
5. Run migrations: `bun run db:migrate`. This creates the tables and the `powersync` publication, limited to the seven app tables. If PowerSync or Neon setup already created a `powersync` publication (often `FOR ALL TABLES`), the migration replaces it.
6. Create the replication role for PowerSync in the SQL Editor:
   ```sql
   CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD '<strong password>';
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;
   ```

### PowerSync

1. Create an instance. Under **Database Connection**, paste the Neon *direct* connection string, then set the username to `powersync_role` and its password. Test and save.
2. **Client Auth:** add an **HS256** key, with `kid` = `POWERSYNC_JWT_KID` and the secret = `POWERSYNC_JWT_SECRET`. Set **JWT Audience** to your exact `POWERSYNC_URL`, then save and deploy.
3. **Sync Streams:** paste `src/server/powersync/sync-streams.yaml`, then Validate and Deploy.

### App

```bash
bun install                      # copies PowerSync workers to public/@powersync
cp .env.example .env.local       # fill in the values above
bun run db:migrate
bun dev                          # sign in once with Google
bun run make-admin you@gmail.com # become admin; manage other roles in the UI
```
