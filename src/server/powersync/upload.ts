import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { entrances, events, scanResult, scans, tickets } from "@/server/db/schema/app";
import { canScanAt } from "@/server/auth/permissions";
import type { Viewer } from "@/server/auth/viewer";
import { normalizeCode, verifyTicket, type ScanVerdict } from "@/lib/tickets";

/**
 * Applies a batch of client CRUD operations uploaded by PowerSync.
 *
 * Only `scans` are written through PowerSync (so scanning works offline);
 * every other table is mutated with Server Actions and replicated down.
 * The server re-verifies each scan and stores its own verdict. Redemption is
 * a conditional UPDATE (`redeemed_at IS NULL`), so when two offline devices
 * admit the same ticket, the first upload wins and the second is recorded as
 * `already_used` — that row then syncs back and the device shows it.
 */

const scanOp = z.object({
  op: z.literal("PUT"),
  type: z.literal("scans"),
  id: z.uuid(),
  data: z.object({
    event_id: z.uuid(),
    entrance_id: z.uuid().nullable().optional(),
    code: z.string(),
    result: z.string().optional(),
    scanned_at: z.string(),
  }),
});

export const uploadBody = z.object({
  ops: z.array(z.object({ op: z.string(), type: z.string(), id: z.string(), data: z.unknown() })).max(500),
});

export type UploadOutcome = { id: string; status: "applied" | "rejected"; reason?: string };

export async function applyUpload(viewer: Viewer, ops: z.infer<typeof uploadBody>["ops"]) {
  const outcomes: UploadOutcome[] = [];
  for (const raw of ops) {
    const parsed = scanOp.safeParse(raw);
    if (!parsed.success) {
      // Unknown or disallowed writes are dropped so they can't block the queue.
      outcomes.push({ id: raw.id, status: "rejected", reason: "unsupported operation" });
      continue;
    }
    outcomes.push(await applyScan(viewer, parsed.data));
  }
  return outcomes;
}

async function applyScan(viewer: Viewer, op: z.infer<typeof scanOp>): Promise<UploadOutcome> {
  const { data } = op;
  const station = { eventId: data.event_id, entranceId: data.entrance_id ?? null };
  if (!(await canScanAt(viewer, station))) {
    return { id: op.id, status: "rejected", reason: "not allowed to scan here" };
  }

  const code = normalizeCode(data.code);
  const scannedAt = new Date(data.scanned_at);
  const clientResult = asVerdict(data.result);

  await db.transaction(async (tx) => {
    const [event] = await tx
      .select({ disabled: events.disabled })
      .from(events)
      .where(eq(events.id, station.eventId));
    if (!event) return;

    const [ticket] = await tx
      .select()
      .from(tickets)
      .where(and(eq(tickets.code, code), eq(tickets.eventId, station.eventId)));
    const [ticketEntrance] = ticket?.entranceId
      ? await tx
          .select({ id: entrances.id, disabled: entrances.disabled })
          .from(entrances)
          .where(eq(entrances.id, ticket.entranceId))
      : [];

    let result: ScanVerdict = verifyTicket({
      ticket: ticket ?? null,
      eventDisabled: event.disabled,
      ticketEntrance: ticketEntrance ?? null,
      stationEntranceId: station.entranceId,
    });

    if (result === "accepted" && ticket) {
      const redeemed = await tx
        .update(tickets)
        .set({
          redeemedAt: scannedAt,
          redeemedBy: viewer.id,
          redeemedEntranceId: station.entranceId,
        })
        .where(and(eq(tickets.id, ticket.id), isNull(tickets.redeemedAt)))
        .returning({ id: tickets.id });
      if (redeemed.length === 0) result = "already_used";
    }

    await tx
      .insert(scans)
      .values({
        id: op.id,
        eventId: station.eventId,
        entranceId: station.entranceId,
        ticketId: ticket?.id ?? null,
        code,
        scannerId: viewer.id,
        scannerName: viewer.name,
        result,
        clientResult,
        scannedAt,
      })
      // Retried uploads are idempotent.
      .onConflictDoNothing({ target: scans.id });
  });

  return { id: op.id, status: "applied" };
}

function asVerdict(value: string | undefined): ScanVerdict | null {
  return scanResult.enumValues.find((v) => v === value) ?? null;
}
