# 6. Tickets & scanning

## Codes (`src/lib/tickets.ts`)

- 6 characters from `346789ABCDEFGHJKMNPQRTUVWXY`. Look-alikes (0/O, 1/I/L, 2/Z, 5/S) are excluded so codes survive being read aloud or typed in a hurry.
- Every code contains **at least one letter and at least one digit**, as the spec requires.
- Codes are generated with `crypto.getRandomValues` and rejection sampling, so there is no modulo bias. That gives 27⁶ ≈ 387M possibilities.
- A unique index on `tickets.code` guarantees global uniqueness. If a batch hits a collision, `generateTickets` retries just the rows that failed, inside one transaction.
- Batches are 1–1000 tickets.

## Verification (`verifyTicket`)

The same pure function runs on the device (offline) and on the server (authoritative). The checks run in this order:

| # | Check | Verdict | Scanner sees |
|---|---|---|---|
| 1 | no ticket with this code for this event | `invalid` | "Invalid code" |
| 2 | event disabled | `event_disabled` | "Event closed" |
| 3 | ticket voided | `voided` | "Voided ticket" |
| 4 | ticket tied to entrance X, scanner standing at entrance Y | `wrong_entrance` | **"This ticket belongs to X. Please direct the guest to X: ⟨directions⟩"** |
| 5 | ticket's entrance disabled | `entrance_disabled` | "Entrance closed" |
| 6 | already redeemed (on the server, or by a pending local scan) | `already_used` | "First admitted at 19:42 through East Gate" |
| 7 | otherwise | `accepted` | "Admitted" |

Notes on these rules:

- A ticket with no entrance never triggers check 4.
- A roaming scanner (no entrance) only triggers check 4 if they choose the door they're standing at.
- The entrance's "Directions" field is shown in the redirect message, so give entrances signage-friendly names and directions.

## The scanning page (`/scan`)

- **Station:**
  - An assigned scanner is locked to their entrance.
  - A roaming scanner, admin or organizer picks the event and, optionally, the entrance.
  - The device remembers its last station.
- **Code entry:** six-slot input (shadcn `InputOTP`). The code is checked automatically when the last character is typed, then the input clears and refocuses for the next guest.
- **Result card:** large, colour-coded and announced to screen readers. The device vibrates once for admitted and twice for rejected.
- **Feedback:** an offline banner, a live sync pill, per-scanner counters, and the recent scans list.

## Prices

Prices are optional and set per batch when generating, so a "VIP" batch and an "Early bird" batch can differ. Every ticket in a batch shares its price. The amount is stored in the event currency's minor unit (`src/lib/money.ts`), and the Overview tab shows the total face value issued and admitted once any batch has a price.

## A4 PDF (`src/server/tickets/pdf.ts`)

`GET /api/events/:eventId/tickets/download?batch=<id>&tz=<IANA>` downloads a zip (`fflate`, stored without recompression) with one PDF per batch, named `NN-<label or entrance>-<count>.pdf`. With `batch`, the zip holds just that batch. Serial numbers restart at 1 in each batch. Only event managers can download them.

- **Page layout:** A4 (595 × 842 pt), 28 pt margins, **2 columns × 5 rows = 10 tickets per page**.
- **Each ticket:**
  - notched outline with a dashed perforation and an amber spine
  - "ADMIT ONE", the event name (wrapped to 2 lines) and the date/time in the browser's timezone (`tz`)
  - venue and entrance ("Any entrance" when untied)
  - the price, bottom right, when the ticket's batch has one (formatted in the event's currency)
  - a stub with the code split 3+3 in Courier Bold, plus a serial number
- **Cut guides:** dashed lines run through the gaps between tickets and around the used rows, with vector scissors marks in the margin (the standard fonts have no ✂ glyph).
- **Fonts:** standard PDF fonts only, so there's no font embedding and output is fast. Characters outside WinAnsi print as `?`.
- **Filtering:** voided tickets are skipped. Without `batch`, every ticket for the event is printed.
