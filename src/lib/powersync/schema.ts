import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { DrizzleAppSchema } from "@powersync/drizzle-driver";

/**
 * Client-side (SQLite) mirror of the synced Postgres tables. PowerSync only
 * stores text/integer/real: booleans arrive as 0/1 and timestamps as ISO text.
 * The `id` column is implicit in PowerSync tables.
 */

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  venue: text("venue").notNull(),
  starts_at: text("starts_at").notNull(),
  ends_at: text("ends_at"),
  // Nullable here: rows synced before the column existed arrive without it.
  currency: text("currency"),
  disabled: integer("disabled").notNull(),
  created_by: text("created_by").notNull(),
  created_at: text("created_at").notNull(),
});

export const entrances = sqliteTable("entrances", {
  id: text("id").primaryKey(),
  event_id: text("event_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  disabled: integer("disabled").notNull(),
  created_at: text("created_at").notNull(),
});

export const event_organizers = sqliteTable("event_organizers", {
  id: text("id").primaryKey(),
  event_id: text("event_id").notNull(),
  user_id: text("user_id").notNull(),
  user_name: text("user_name").notNull(),
  user_email: text("user_email").notNull(),
  is_owner: integer("is_owner").notNull(),
  created_at: text("created_at").notNull(),
});

export const event_scanners = sqliteTable("event_scanners", {
  id: text("id").primaryKey(),
  event_id: text("event_id").notNull(),
  entrance_id: text("entrance_id"),
  user_id: text("user_id").notNull(),
  user_name: text("user_name").notNull(),
  user_email: text("user_email").notNull(),
  disabled: integer("disabled").notNull(),
  created_at: text("created_at").notNull(),
});

export const ticket_batches = sqliteTable("ticket_batches", {
  id: text("id").primaryKey(),
  event_id: text("event_id").notNull(),
  entrance_id: text("entrance_id"),
  label: text("label"),
  quantity: integer("quantity").notNull(),
  price_minor: integer("price_minor"),
  created_at: text("created_at").notNull(),
});

export const tickets = sqliteTable("tickets", {
  id: text("id").primaryKey(),
  event_id: text("event_id").notNull(),
  batch_id: text("batch_id").notNull(),
  entrance_id: text("entrance_id"),
  code: text("code").notNull(),
  voided: integer("voided").notNull(),
  redeemed_at: text("redeemed_at"),
  redeemed_by: text("redeemed_by"),
  redeemed_entrance_id: text("redeemed_entrance_id"),
  created_at: text("created_at").notNull(),
});

export const scans = sqliteTable("scans", {
  id: text("id").primaryKey(),
  event_id: text("event_id").notNull(),
  ticket_id: text("ticket_id"),
  entrance_id: text("entrance_id"),
  code: text("code").notNull(),
  scanner_id: text("scanner_id").notNull(),
  scanner_name: text("scanner_name").notNull(),
  result: text("result").notNull(),
  client_result: text("client_result"),
  scanned_at: text("scanned_at").notNull(),
});

export const drizzleSchema = {
  events,
  entrances,
  event_organizers,
  event_scanners,
  ticket_batches,
  tickets,
  scans,
};

export const AppSchema = new DrizzleAppSchema(drizzleSchema);

export type EventRow = typeof events.$inferSelect;
export type EntranceRow = typeof entrances.$inferSelect;
export type TicketRow = typeof tickets.$inferSelect;
export type ScannerRow = typeof event_scanners.$inferSelect;
export type OrganizerRow = typeof event_organizers.$inferSelect;
export type BatchRow = typeof ticket_batches.$inferSelect;
export type ScanRow = typeof scans.$inferSelect;
