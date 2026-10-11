"use client";

import { and, desc, eq } from "drizzle-orm";
import { verifyTicket, type ScanVerdict } from "@/lib/tickets";
import type { Viewer } from "@/server/auth/viewer";
import type { LocalDb } from "./db";
import { entrances, events, scans, tickets, type EntranceRow, type TicketRow } from "./schema";

export type Station = { eventId: string; entranceId: string | null };

export type ScanOutcome = {
  id: string;
  code: string;
  verdict: ScanVerdict;
  ticket: TicketRow | null;
  /** The entrance printed on the ticket — where to send a guest at the wrong door. */
  ticketEntrance: EntranceRow | null;
  /** For `already_used`: when and where it was first admitted. */
  usedAt: string | null;
  usedAtEntrance: EntranceRow | null;
  scannedAt: string;
};

/**
 * Verifies a code against the local SQLite copy — instant and offline-capable
 * — and records the attempt in `scans`. PowerSync uploads the row; the server
 * re-verifies it and its verdict syncs back (see src/server/powersync/upload.ts).
 */
export async function scanCode(db: LocalDb, viewer: Viewer, station: Station, code: string): Promise<ScanOutcome> {
  const [event] = await db.select().from(events).where(eq(events.id, station.eventId));
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.code, code), eq(tickets.event_id, station.eventId)));
  const ticketEntrance = ticket?.entrance_id
    ? ((await db.select().from(entrances).where(eq(entrances.id, ticket.entrance_id)))[0] ?? null)
    : null;

  // An admission this device made that hasn't round-tripped to the server yet.
  const [pendingAdmission] = ticket
    ? await db
        .select()
        .from(scans)
        .where(and(eq(scans.ticket_id, ticket.id), eq(scans.result, "accepted")))
        .orderBy(desc(scans.scanned_at))
        .limit(1)
    : [];

  const usedAt = ticket?.redeemed_at ?? pendingAdmission?.scanned_at ?? null;
  const verdict = verifyTicket({
    ticket: ticket
      ? { entranceId: ticket.entrance_id, voided: ticket.voided === 1, redeemedAt: usedAt }
      : null,
    eventDisabled: !event || event.disabled === 1,
    ticketEntrance: ticketEntrance ? { id: ticketEntrance.id, disabled: ticketEntrance.disabled === 1 } : null,
    stationEntranceId: station.entranceId,
  });

  const usedEntranceId = ticket?.redeemed_entrance_id ?? pendingAdmission?.entrance_id ?? null;
  const usedAtEntrance =
    verdict === "already_used" && usedEntranceId
      ? ((await db.select().from(entrances).where(eq(entrances.id, usedEntranceId)))[0] ?? null)
      : null;

  const id = crypto.randomUUID();
  const scannedAt = new Date().toISOString();
  await db.insert(scans).values({
    id,
    event_id: station.eventId,
    entrance_id: station.entranceId,
    ticket_id: ticket?.id ?? null,
    code,
    scanner_id: viewer.id,
    scanner_name: viewer.name,
    result: verdict,
    client_result: verdict,
    scanned_at: scannedAt,
  });

  return {
    id,
    code,
    verdict,
    ticket: ticket ?? null,
    ticketEntrance,
    usedAt,
    usedAtEntrance,
    scannedAt,
  };
}
