"use client";

import { and, asc, count, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { toCompilableQuery } from "@powersync/drizzle-driver";
import { useQuery } from "@powersync/react";
import type { EventWhen } from "@/lib/search-params";
import { useSession } from "./provider";
import {
  entrances,
  event_organizers,
  event_scanners,
  events,
  scans,
  ticket_batches,
  tickets,
} from "./schema";

/**
 * Live queries over the local SQLite copy. Every hook re-renders whenever
 * PowerSync applies a change, so all screens update in realtime.
 */

export function useEvents() {
  const { db } = useSession();
  return useQuery(toCompilableQuery(db.select().from(events).orderBy(desc(events.starts_at))));
}

export function useEvent(eventId: string) {
  const { db } = useSession();
  const result = useQuery(toCompilableQuery(db.select().from(events).where(eq(events.id, eventId))));
  return { ...result, event: result.data[0] };
}

export function useEventStats() {
  const { db } = useSession();
  const result = useQuery(
    toCompilableQuery(
      db
        .select({
          eventId: tickets.event_id,
          total: count(),
          admitted: sql<number>`sum(case when ${tickets.redeemed_at} is not null then 1 else 0 end)`,
          voided: sql<number>`sum(${tickets.voided})`,
        })
        .from(tickets)
        .groupBy(tickets.event_id),
    ),
  );
  const byEvent = new Map(result.data.map((r) => [r.eventId, r]));
  return { ...result, byEvent };
}

export function useEntrances(eventId: string) {
  const { db } = useSession();
  return useQuery(
    toCompilableQuery(
      db.select().from(entrances).where(eq(entrances.event_id, eventId)).orderBy(asc(entrances.name)),
    ),
  );
}

export function useEntranceStats(eventId: string) {
  const { db } = useSession();
  return useQuery(
    toCompilableQuery(
      db
        .select({
          entranceId: tickets.entrance_id,
          total: count(),
          admitted: sql<number>`sum(case when ${tickets.redeemed_at} is not null then 1 else 0 end)`,
        })
        .from(tickets)
        .where(eq(tickets.event_id, eventId))
        .groupBy(tickets.entrance_id),
    ),
  );
}

export function useBatches(eventId: string) {
  const { db } = useSession();
  return useQuery(
    toCompilableQuery(
      db
        .select()
        .from(ticket_batches)
        .where(eq(ticket_batches.event_id, eventId))
        .orderBy(desc(ticket_batches.created_at)),
    ),
  );
}

export type TicketFilter = "all" | "unused" | "admitted" | "voided";

/** LIKE pattern matching `text` anywhere, with % and _ in the input taken literally. */
const contains = (text: string) => `%${text.replace(/[\\%_]/g, "\\$&")}%`;
const likeText = (column: SQLiteColumn, text: string) => sql`${column} like ${contains(text)} escape '\\'`;

const firstRow = (rows: { total: number }[]) => Number(rows[0]?.total ?? 0);

function ticketWhere(eventId: string, opts: { search: string; filter: TicketFilter }) {
  const status = {
    all: undefined,
    unused: sql`${tickets.redeemed_at} is null and ${tickets.voided} = 0`,
    admitted: isNotNull(tickets.redeemed_at),
    voided: eq(tickets.voided, 1),
  }[opts.filter];
  return and(
    eq(tickets.event_id, eventId),
    opts.search ? likeText(tickets.code, opts.search.toUpperCase()) : undefined,
    status,
  );
}

/** One page of an event's tickets plus the total matching the same filters. */
export function useTickets(
  eventId: string,
  opts: { search: string; filter: TicketFilter; page: number; pageSize: number },
) {
  const { db } = useSession();
  const where = ticketWhere(eventId, opts);
  const rows = useQuery(
    toCompilableQuery(
      db
        .select()
        .from(tickets)
        .where(where)
        .orderBy(desc(tickets.created_at), asc(tickets.code))
        .limit(opts.pageSize)
        .offset((opts.page - 1) * opts.pageSize),
    ),
  );
  const totals = useQuery(toCompilableQuery(db.select({ total: count() }).from(tickets).where(where)));
  return { ...rows, total: firstRow(totals.data) };
}

export function useScanners(eventId: string) {
  const { db } = useSession();
  return useQuery(
    toCompilableQuery(
      db
        .select()
        .from(event_scanners)
        .where(eq(event_scanners.event_id, eventId))
        .orderBy(asc(event_scanners.user_name)),
    ),
  );
}

export function useOrganizers(eventId: string) {
  const { db } = useSession();
  return useQuery(
    toCompilableQuery(
      db
        .select()
        .from(event_organizers)
        .where(eq(event_organizers.event_id, eventId))
        .orderBy(desc(event_organizers.is_owner), asc(event_organizers.user_name)),
    ),
  );
}

export function useScans(eventId: string, limit = 50) {
  const { db } = useSession();
  return useQuery(
    toCompilableQuery(
      db
        .select()
        .from(scans)
        .where(eq(scans.event_id, eventId))
        .orderBy(desc(scans.scanned_at))
        .limit(limit),
    ),
  );
}

/** Scanner assignments for the signed-in user (drives the /scan station picker). */
export function useMyAssignments() {
  const { db, viewer } = useSession();
  return useQuery(
    toCompilableQuery(
      db
        .select({
          id: event_scanners.id,
          eventId: event_scanners.event_id,
          entranceId: event_scanners.entrance_id,
          disabled: event_scanners.disabled,
        })
        .from(event_scanners)
        .where(eq(event_scanners.user_id, viewer.id)),
    ),
  );
}

/** Scan count per verdict for an event (every scan, not just the recent ones). */
export function useScanOutcomes(eventId: string) {
  const { db } = useSession();
  return useQuery(
    toCompilableQuery(
      db
        .select({ result: scans.result, total: count() })
        .from(scans)
        .where(eq(scans.event_id, eventId))
        .groupBy(scans.result),
    ),
  );
}

/**
 * Admitted tickets per UTC hour, keyed "YYYY-MM-DD HH" (timestamps are stored
 * as UTC text), so the chart matches the admitted total even after undos.
 */
export function useAdmissionsByHour(eventId: string) {
  const { db } = useSession();
  const hour = sql<string>`substr(${tickets.redeemed_at}, 1, 13)`;
  return useQuery(
    toCompilableQuery(
      db
        .select({ hour, total: count() })
        .from(tickets)
        .where(and(eq(tickets.event_id, eventId), isNotNull(tickets.redeemed_at)))
        .groupBy(hour)
        .orderBy(hour),
    ),
  );
}

/**
 * Face value of an event's non-voided tickets: issued and admitted totals in
 * the minor unit, plus how many tickets carry a price at all.
 */
export function useEventValue(eventId: string) {
  const { db } = useSession();
  const result = useQuery(
    toCompilableQuery(
      db
        .select({
          priced: sql<number>`count(${ticket_batches.price_minor})`,
          issued: sql<number>`coalesce(sum(${ticket_batches.price_minor}), 0)`,
          admitted: sql<number>`coalesce(sum(case when ${tickets.redeemed_at} is not null then ${ticket_batches.price_minor} end), 0)`,
        })
        .from(tickets)
        .innerJoin(ticket_batches, eq(ticket_batches.id, tickets.batch_id))
        .where(and(eq(tickets.event_id, eventId), eq(tickets.voided, 0))),
    ),
  );
  return { ...result, value: result.data[0] };
}

/**
 * A page of events for the events list. "Upcoming" includes anything that
 * ended less than six hours ago, soonest first; "past" is newest first.
 */
export function useEventsPage(opts: { search: string; when: EventWhen; page: number; pageSize: number; now: number }) {
  const { db } = useSession();
  const cutoff = new Date(opts.now - 6 * 3600_000).toISOString();
  // julianday() parses both "YYYY-MM-DD HH:MM:SS" and ISO "T" timestamps, so
  // the comparison doesn't depend on how PowerSync formatted the text.
  const ends = sql`julianday(coalesce(${events.ends_at}, ${events.starts_at}))`;
  const where = and(
    opts.search ? or(likeText(events.name, opts.search), likeText(events.venue, opts.search)) : undefined,
    opts.when === "upcoming" ? sql`${ends} >= julianday(${cutoff})` : undefined,
    opts.when === "past" ? sql`${ends} < julianday(${cutoff})` : undefined,
  );
  const rows = useQuery(
    toCompilableQuery(
      db
        .select()
        .from(events)
        .where(where)
        .orderBy(opts.when === "upcoming" ? asc(events.starts_at) : desc(events.starts_at))
        .limit(opts.pageSize)
        .offset((opts.page - 1) * opts.pageSize),
    ),
  );
  const totals = useQuery(toCompilableQuery(db.select({ total: count() }).from(events).where(where)));
  return { ...rows, total: firstRow(totals.data) };
}

/** A page of an event's scans, newest first, optionally filtered by code. */
export function useScansPage(eventId: string, opts: { search: string; page: number; pageSize: number }) {
  const { db } = useSession();
  const where = and(eq(scans.event_id, eventId), opts.search ? likeText(scans.code, opts.search.toUpperCase()) : undefined);
  const rows = useQuery(
    toCompilableQuery(
      db
        .select()
        .from(scans)
        .where(where)
        .orderBy(desc(scans.scanned_at))
        .limit(opts.pageSize)
        .offset((opts.page - 1) * opts.pageSize),
    ),
  );
  const totals = useQuery(toCompilableQuery(db.select({ total: count() }).from(scans).where(where)));
  return { ...rows, total: firstRow(totals.data) };
}
