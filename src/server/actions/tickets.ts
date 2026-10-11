"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { entrances, events, ticketBatches, tickets } from "@/server/db/schema/app";
import { requireEventManager } from "@/server/auth/permissions";
import { toMinor } from "@/lib/money";
import { generateCode, MAX_BATCH } from "@/lib/tickets";
import { run, UserFacingError } from "./result";

export async function generateTickets(input: {
  eventId: string;
  entranceId: string | null;
  quantity: number;
  label?: string | null;
  /** Price per ticket in major units (e.g. 15000 for MWK 15,000); omit for no price. */
  price?: number | null;
}) {
  const schema = z.object({
    eventId: z.uuid(),
    entranceId: z.uuid().nullable(),
    quantity: z.coerce
      .number()
      .int()
      .min(1, "Generate at least one ticket.")
      .max(MAX_BATCH, `At most ${MAX_BATCH} tickets per batch.`),
    label: z.string().trim().max(60).optional().nullable(),
    price: z.number().min(0, "Price can't be negative.").max(100_000_000).optional().nullable(),
  });
  return run(schema, input, async (data) => {
    const actor = await requireEventManager(data.eventId);
    const [event] = await db.select({ currency: events.currency }).from(events).where(eq(events.id, data.eventId));
    if (!event) throw new UserFacingError("Event not found.");
    if (data.entranceId) {
      const [entrance] = await db
        .select({ id: entrances.id })
        .from(entrances)
        .where(and(eq(entrances.id, data.entranceId), eq(entrances.eventId, data.eventId)));
      if (!entrance) throw new UserFacingError("That entrance isn't part of this event.");
    }

    return db.transaction(async (tx) => {
      const [batch] = await tx
        .insert(ticketBatches)
        .values({
          eventId: data.eventId,
          entranceId: data.entranceId,
          label: data.label,
          quantity: data.quantity,
          priceMinor: data.price == null ? null : toMinor(data.price, event.currency),
          createdBy: actor.id,
        })
        .returning({ id: ticketBatches.id });

      // Codes are globally unique; collisions are astronomically rare at
      // 27^6 ≈ 387M, but retry until the batch is full rather than assume.
      let remaining = data.quantity;
      for (let attempt = 0; remaining > 0; attempt++) {
        if (attempt > 10) throw new Error("Could not allocate unique ticket codes");
        const codes = new Set<string>();
        while (codes.size < remaining) codes.add(generateCode());
        const inserted = await tx
          .insert(tickets)
          .values(
            [...codes].map((code) => ({
              code,
              eventId: data.eventId,
              entranceId: data.entranceId,
              batchId: batch.id,
            })),
          )
          .onConflictDoNothing({ target: tickets.code })
          .returning({ id: tickets.id });
        remaining -= inserted.length;
      }
      return batch;
    });
  });
}

async function managedTicket(id: string) {
  const [row] = await db
    .select({ eventId: tickets.eventId })
    .from(tickets)
    .where(eq(tickets.id, id));
  if (!row) throw new UserFacingError("Ticket not found.");
  await requireEventManager(row.eventId);
}

export async function setTicketVoided(input: { id: string; voided: boolean }) {
  return run(z.object({ id: z.uuid(), voided: z.boolean() }), input, async ({ id, voided }) => {
    await managedTicket(id);
    await db.update(tickets).set({ voided }).where(eq(tickets.id, id));
  });
}

/** Clears a redemption, e.g. when a guest was admitted by mistake. */
export async function resetTicket(input: { id: string }) {
  return run(z.object({ id: z.uuid() }), input, async ({ id }) => {
    await managedTicket(id);
    await db
      .update(tickets)
      .set({ redeemedAt: null, redeemedBy: null, redeemedEntranceId: null })
      .where(eq(tickets.id, id));
  });
}

export async function deleteTicketBatch(input: { id: string }) {
  return run(z.object({ id: z.uuid() }), input, async ({ id }) => {
    const [batch] = await db
      .select({ eventId: ticketBatches.eventId })
      .from(ticketBatches)
      .where(eq(ticketBatches.id, id));
    if (!batch) throw new UserFacingError("That batch was already deleted.");
    await requireEventManager(batch.eventId);
    await db.delete(ticketBatches).where(eq(ticketBatches.id, id));
  });
}
