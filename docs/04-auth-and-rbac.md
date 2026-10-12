# 4. Auth & RBAC

## Sign-in

- **Provider:** Neon Auth (managed Better Auth), with Google OAuth as the only sign-in method. The sign-in page shows a single "Continue with Google" button (`src/app/sign-in/google-button.tsx`).
- **Server instance:** `src/server/auth/index.ts` calls `createNeonAuth({ baseUrl, cookies.secret })`.
- **Proxy route:** `src/app/api/auth/[...path]/route.ts` forwards the browser client (`src/lib/auth-client.ts`) to Neon Auth through `/api/auth/*`.
- **Gate in `src/proxy.ts`:** this is Next 16's renamed middleware. It runs `auth.middleware()` over `/continue`, `/dashboard`, `/scan` and `/pending`, redirecting signed-out visitors to `/sign-in` and refreshing sessions. It must cover `/continue`: that is the Google `callbackURL`, and the middleware is what exchanges the `neon_auth_session_verifier` parameter for the session cookie. This is only an optimistic check. Every real authorization check happens on the server, close to the data.
- **After sign-in:** Google returns the user to `/continue`, which sends them to their home: `/dashboard`, `/scan` or `/pending`. New accounts use the same callback (`newUserCallbackURL`). `/pending` tells users with no access to contact an admin or their event's organizer, and the landing page redirects them there too.
- **Client gate for `/dashboard` and `/scan`** (`src/components/app/viewer-gate.tsx`): the layouts are static so they can load offline. The gate starts from the viewer cached on the device (`localStorage`), then confirms with `GET /api/viewer` whenever the server is reachable. A 401 clears the cache and goes to `/sign-in`, and a missing area permission goes to the viewer's home. It only decides which UI to show: data still reaches the device only through the PowerSync token and Sync Streams, and every write is authorized in Server Actions or the upload endpoint. Sign-out clears the cached viewer and the local database.

## Roles

Roles live in the Better Auth **admin plugin's `role` column** on `neon_auth.user`. New sign-ups get `user`.

| Role | Can |
|---|---|
| `admin` | Everything: all events, user roles, inviting and revoking organizers, scanning anywhere |
| `organizer` | Create events. Manage the events they created or were invited to. Scan at those events. |
| `user` invited to an event | Manage that event only, with no event creation |
| `ticket_scanner` | Only `/scan`, only for events they are assigned to |
| `user` (nothing granted) | Only `/pending` |

The **viewer DAL** (`src/server/auth/viewer.ts`) reads the session cookie and then reads `role` and `banned` **fresh from `neon_auth.user`**. The session cookie caches user data for 5 minutes, so reading the role from the database makes promotions and demotions take effect immediately.

## Permission matrix (enforced in `src/server/auth/permissions.ts`)

| Action | admin | event organizer (creator or invited) | ticket_scanner |
|---|---|---|---|
| Create event | ✓ | only with the `organizer` role | ✗ |
| Edit, disable or enable event | ✓ | ✓ | ✗ |
| Delete event | ✓ | creator (owner) only | ✗ |
| Entrances: create, edit, disable, delete | ✓ | ✓ | ✗ |
| Tickets: generate, void, reset, delete batch, print | ✓ | ✓ | ✗ |
| Scanners: add, move, disable, remove | ✓ | ✓ | ✗ |
| Invite or revoke organizers | ✓ | ✗ (read-only list) | ✗ |
| Change platform roles | ✓ | ✗ | ✗ |
| Record scans | anywhere | events they manage | own assignment only |

Admin-only screens (`/dashboard/users`) render an **Access declined** panel for anyone whose admin-plugin role isn't `admin`. The matching Server Actions throw `AuthorizationError` independently of the UI.

## Why some role writes bypass the plugin API

`src/server/auth/roles.ts#setUserRole`:

- **`admin` and `user`:** set through `auth.admin.setRole()`, the admin plugin API, which also verifies the caller is an admin.
- **`organizer` and `ticket_scanner`:** managed Better Auth only ships the two built-in roles. The SDK's types reject anything else, and custom access-control statements can't be configured on the managed service. These roles are written straight to the plugin's `role` column after the server has authorized the caller. The value is in the same column the plugin reads, so `admin.listUsers` and the session's `user.role` show it as normal.
- **An organizer adding a scanner:** the organizer isn't an admin and can't call the admin API, so the promotion to `ticket_scanner` uses the same direct write, after `requireEventManager` passes.

## Bootstrap

1. Sign in with Google once.
2. Run `bun run make-admin you@gmail.com` (`src/server/scripts/make-admin.ts`). Alternatively, use Neon Console → Auth → Users → ⋯ → **Make admin**.
3. Manage all other roles from **People & roles** in the dashboard.
