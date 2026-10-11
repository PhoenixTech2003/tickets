# 1. Decisions

The spec asked for questions before implementation. These were agreed with the product owner. Points marked *default* were proposed and accepted as-is.

## Roles

- Everyone who signs up gets the Better Auth admin plugin's default role, `user`.
- Platform roles, all stored in the admin plugin's `role` column:
  - `user`: no access until granted something. Sees the "awaiting access" page.
  - `organizer`: can create events.
  - `ticket_scanner`: can only use the scanning page.
  - `admin`: full control.
- Anyone without the admin plugin's `admin` role who opens an admin area is declined.
- Only admins and organizers create events.
- Inviting someone as an event organizer gives them access to that event only. It does not grant the `organizer` role, which only admins give and which is what allows creating events.
- Only admins invite or revoke event organizers. *(default)*
- Adding a scanner promotes a plain `user` to `ticket_scanner`. Removing their last assignment returns them to `user`.
- First admin: `bun run make-admin <email>` after the first Google sign-in. *(default)*

## Scanning

- Scanning works offline. Each scanner's device holds a synced copy of the tickets for their events. *(default)*
- Tickets are single-use. A second scan says "Already used at 19:42 through North Gate". *(default)*
- If two offline devices admit the same ticket, the first upload wins. The other scan is recorded as `already_used` and syncs back to that device. *(default)*

## Entrances

- A ticket with no entrance is valid at every entrance. *(default)*
- A scanner with no entrance is "roaming": they admit every valid ticket at any door, and can optionally say which door they are standing at. *(default)*
- Disabling an event rejects every scan with "Event closed". Disabling an entrance rejects its tickets with "Entrance closed". A disabled scanner loses the event from their device. *(default)*

## Tickets

- Tickets are generated in anonymous batches: a quantity, an optional entrance and an optional label. *(default)*
- Each ticket prints the event name, date and time, venue, entrance and a 6-character code mixing letters and numbers. *(default)*

## Design & stack

- Dark-first "night venue" look with a light-mode toggle. *(default)*
- Every UI component comes from shadcn/ui, which was requested during the build.
- PowerSync Cloud. *(default)*
- bun as the package manager (new project).
