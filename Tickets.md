# Tickets

Event ticketing with offline-capable door scanning: organizers issue and print tickets, and door staff verify them, even with no signal.

## Roles & access

Everyone signs in with Google. New sign-ups have no access until an admin grants some.

| Role | Can |
|---|---|
| Admin | Everything: all events, platform roles, inviting and revoking organizers, scanning anywhere |
| Organizer | Create events. Manage the events they created or were invited to, and scan at them |
| Invited event organizer | Manage that one event only. Cannot create events |
| Ticket scanner | Only the scanning page, only for the events they are assigned to |
| User (nothing granted) | Only an "awaiting access" page |

- Only an event's creator (or an admin) can delete it.
- Only admins invite or revoke event organizers. Organizers see the list read-only.
- Adding someone as a scanner promotes a plain user to ticket scanner. Removing their last assignment returns them to user.
- Admins manage roles from **People & roles**. Anyone else opening an admin screen sees "Access declined", and the server rejects the action regardless of the UI.

## Functionality

### Events

- Create, edit, disable, re-enable and delete events (name, venue, date and time, currency).
- The events list filters by **Upcoming / Past / All**, searches by name or venue, and pages 10 at a time.
- Each event has tabs: Overview, Entrances, Tickets, Scanners, Organizers and Activity. The open tab, search, filter and page live in the URL, so Back and shared links work.
- The Overview shows live figures: tickets issued, admitted, still to arrive and admitted in the last hour. Once any batch has a price it also shows the face value issued and admitted. Below the figures are an admissions-by-hour chart and a breakdown of scan outcomes.

### Entrances

- Create, edit, disable and delete entrances. An event may also have no entrances.
- Each entrance has a name and signage-friendly **directions**, which are shown when a guest is redirected.

### Organizers

- Admins invite organizers to an event by searching everyone who has signed up, by email, and can revoke them.

### Scanners

- Add scanners by searching signed-up users by name or email. Each scanner can be tied to an entrance or left **roaming**.
- Move a scanner to another entrance, or disable or remove them. A disabled scanner loses the event from their device.

### Tickets

- Generate tickets in batches of 1–1000, with an optional entrance, label and **price**. Every ticket in a batch shares its price.
- Codes are 6 characters mixing letters and digits, with at least one of each. Look-alike characters (0/O, 1/I/L, 2/Z, 5/S) are excluded, and codes are unique across the platform.
- Void or un-void a single ticket, reset a used ticket, or delete a whole batch.
- The ticket list searches by code, filters by **All / Unused / Admitted / Voided**, and pages 50 at a time.

### Printing

- Download a zip with one A4 PDF per batch, or a single batch on its own. The download shows a progress bar.
- Pages hold 2 columns × 5 rows (10 tickets), with cut guides and scissor marks.
- Each ticket shows the event name, date and time (in the downloader's timezone), venue, entrance ("Any entrance" when untied), the price when there is one, the code split 3+3 and a serial number. Voided tickets are skipped.

### Scanning

- **Works offline.** Each scanner's device keeps a synced copy of the tickets for their events and reconciles when the signal returns.
- **Station:** an assigned scanner is locked to their entrance. A roaming scanner, organizer or admin picks the event and, optionally, the door they are standing at. The device remembers its last station.
- **Code entry:** a six-slot input checks the code as soon as the last character is typed, then clears for the next guest.
- **Verdicts,** checked in this order:

  | Verdict | Scanner sees |
  |---|---|
  | Invalid | "Invalid code" |
  | Event disabled | "Event closed" |
  | Voided | "Voided ticket" |
  | Wrong entrance | "This ticket belongs to X. Please direct the guest to X", plus that entrance's directions |
  | Entrance disabled | "Entrance closed" |
  | Already used | "First admitted at 19:42 through East Gate" |
  | Accepted | "Admitted" |

- A ticket with no entrance is valid at every door. A roaming scanner only triggers "wrong entrance" if they have chosen a door.
- Tickets are single-use. If two offline devices admit the same ticket, the first upload wins and the other scan syncs back as "already used".
- The verdict fills the screen in sage, ochre or brick and is announced to screen readers. The device vibrates once for admitted and twice for rejected. Verdicts dismiss themselves after 4 s (admitted) or 8 s (rejected), or on a tap.
- The page also shows an offline banner, a live sync indicator, per-scanner counters and the recent scans.

### Offline-first app

- After signing in online once, a device can reload and move between the dashboard and scanner pages with no connection. Everything reads from the synced local copy.
- Server-only actions (creating events, generating tickets, downloading PDFs, managing people) wait for the connection and retry automatically.

### Activity & sync

- **Activity tab:** every scan for the event, live, searchable by ticket code and paged 50 at a time.
- **Sync status pages** for the dashboard and the scanner: connection health, pending uploads and the data held on this device.
- The People & roles list searches by name or email and pages 25 at a time.

### Public site

- A landing page and a Google sign-in page. Everything else sits behind sign-in.
- SEO: page titles and descriptions, Open Graph and Twitter cards with a generated share image, a favicon and app icons, a web manifest, `robots.txt` (private areas excluded) and a sitemap.

### Look & feel

- "Powder" design: a matte black-and-white UI with no pure black or white, light by default with a dark mode toggle. Colour is reserved for scan verdicts.
- Every component comes from shadcn/ui.

## Stack

| Concern | Choice | References |
|---|---|---|
| Framework | Next.js 16 with Cache Components, used only where data is static. Anything realtime comes from PowerSync. | [nextjs.org](https://nextjs.org/) |
| Database | Neon Postgres + Drizzle ORM (schema and migrations) | [orm.drizzle.team](https://orm.drizzle.team/) |
| Auth | Neon Auth (managed Better Auth) with the admin plugin. Google OAuth is the only sign-in provider. | [Overview](https://neon.com/docs/auth/overview), [Admin plugin](https://neon.com/docs/auth/guides/plugins/admin) |
| Sync & offline | PowerSync Cloud with Sync Streams and the Drizzle driver | [Neon integration](https://docs.powersync.com/integrations/neon), [Overview](https://docs.powersync.com/intro/powersync-overview), [Drizzle](https://docs.powersync.com/client-sdks/orms/js/drizzle) |
| UI | shadcn/ui, Tailwind | |
| Package manager | bun | |
| Hosting | Vercel | |

## Deployment

- **Production deploys run through GitHub Actions** (`.github/workflows/deploy.yml`). On every push to `main`, the workflow applies the database migrations, then deploys to Vercel. If a migration fails, nothing deploys. Vercel's own Git deploys are turned off for `main`; PR previews are unchanged.
- **Migration drift check** (`.github/workflows/migrations-drift.yml`): a PR fails if the schema changed without a committed migration.
- **Migrations must be additive.** Dropping or renaming something takes two deploys: first stop using it, then remove it.
- **First admin:** after your first Google sign-in, run `bun run make-admin <email>`.

## Environment variables

Every variable, where to get it and where it goes is listed in [`docs/09-setup-and-environment.md`](./docs/09-setup-and-environment.md). In summary:

- **App (`.env.local` locally, Vercel in production):** `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `POWERSYNC_URL`, `POWERSYNC_JWT_SECRET`, `POWERSYNC_JWT_KID` and `NEXT_PUBLIC_SITE_URL`.
- **GitHub `production` environment secrets:** `DATABASE_URL_UNPOOLED`, `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`.

## Codebase organization

- `src/server` holds everything server-side: auth and RBAC, Server Actions, the PowerSync token and upload endpoints, PDF generation, and the database (Drizzle schema and migrations).
- `src/app` holds routes. `src/components/ui` holds shadcn primitives, and `src/components/app` holds feature components composed from them.
- Authorization is enforced on the server, next to the data, never only in the UI.

## Documentation

Every stage of the build is documented in [`/docs`](./docs/README.md): decisions, architecture, database, auth and RBAC, PowerSync, tickets and scanning, caching, the design system, and setup.

Ask before implementing anything that is unclear.
