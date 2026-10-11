-- Tables PowerSync replicates. Listing them explicitly (rather than FOR ALL
-- TABLES) keeps neon_auth and drizzle bookkeeping out of the replication stream.
-- Requires Neon → Settings → Logical Replication → Enable.
-- Replaces any `powersync` publication created during PowerSync/Neon setup
-- (often FOR ALL TABLES); both statements run in the migration transaction.
DROP PUBLICATION IF EXISTS powersync;--> statement-breakpoint
CREATE PUBLICATION powersync FOR TABLE
  "events",
  "entrances",
  "event_organizers",
  "event_scanners",
  "ticket_batches",
  "tickets",
  "scans";
