import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Every synced table has a uuid `id` primary key — PowerSync requires an `id`
 * column and uses it as the row key on the client.
 *
 * User ids reference `neon_auth.user.id`. They are stored as text and the
 * display name/email are denormalised onto membership rows so the client can
 * render them from the synced SQLite copy without syncing the auth schema.
 */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  venue: text("venue").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  /** ISO 4217 code that ticket prices for this event are in. */
  currency: text("currency").notNull().default("MWK"),
  disabled: boolean("disabled").notNull().default(false),
  createdBy: text("created_by").notNull(),
  ...timestamps,
});

export const entrances = pgTable(
  "entrances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    disabled: boolean("disabled").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("entrances_event_idx").on(t.eventId)],
);

/** Organizers with access to an event. The creator is stored with `isOwner`. */
export const eventOrganizers = pgTable(
  "event_organizers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    userEmail: text("user_email").notNull(),
    isOwner: boolean("is_owner").notNull().default(false),
    invitedBy: text("invited_by"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("event_organizers_event_user_uq").on(t.eventId, t.userId),
    index("event_organizers_user_idx").on(t.userId),
  ],
);

/** A ticket scanner assignment. `entranceId = null` means "any entrance". */
export const eventScanners = pgTable(
  "event_scanners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    entranceId: uuid("entrance_id").references(() => entrances.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    userEmail: text("user_email").notNull(),
    disabled: boolean("disabled").notNull().default(false),
    addedBy: text("added_by"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("event_scanners_event_user_uq").on(t.eventId, t.userId),
    index("event_scanners_user_idx").on(t.userId),
  ],
);

/** A generated group of tickets — the unit that gets printed to PDF. */
export const ticketBatches = pgTable(
  "ticket_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    entranceId: uuid("entrance_id").references(() => entrances.id, {
      onDelete: "set null",
    }),
    label: text("label"),
    quantity: integer("quantity").notNull(),
    /** Optional price per ticket in the event currency's minor unit; null = no price. */
    priceMinor: integer("price_minor"),
    createdBy: text("created_by").notNull(),
    ...timestamps,
  },
  (t) => [index("ticket_batches_event_idx").on(t.eventId)],
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => ticketBatches.id, { onDelete: "cascade" }),
    entranceId: uuid("entrance_id").references(() => entrances.id, {
      onDelete: "set null",
    }),
    /** 6 chars, uppercase letters + digits, always containing at least one of each. */
    code: text("code").notNull(),
    voided: boolean("voided").notNull().default(false),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    redeemedBy: text("redeemed_by"),
    redeemedEntranceId: uuid("redeemed_entrance_id"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("tickets_code_uq").on(t.code),
    index("tickets_event_idx").on(t.eventId),
    index("tickets_batch_idx").on(t.batchId),
  ],
);

export const scanResult = pgEnum("scan_result", [
  "accepted",
  "already_used",
  "wrong_entrance",
  "invalid",
  "voided",
  "event_disabled",
  "entrance_disabled",
]);

/**
 * Append-only log of every scan attempt. Scanners write rows locally (offline
 * capable) and PowerSync uploads them; the server re-verifies and stores its
 * own verdict in `result`, keeping the device's verdict in `clientResult`.
 */
export const scans = pgTable(
  "scans",
  {
    id: uuid("id").primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    entranceId: uuid("entrance_id").references(() => entrances.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    scannerId: text("scanner_id").notNull(),
    scannerName: text("scanner_name").notNull(),
    result: scanResult("result").notNull(),
    clientResult: scanResult("client_result"),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("scans_event_idx").on(t.eventId), index("scans_ticket_idx").on(t.ticketId)],
);

export type Event = typeof events.$inferSelect;
export type Entrance = typeof entrances.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type ScanResult = (typeof scanResult.enumValues)[number];
