"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { eventOrganizers, events } from "@/server/db/schema/app";
import {
  requireEventCreator,
  requireEventManager,
  requireEventOwner,
} from "@/server/auth/permissions";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/money";
import { run } from "./result";

const eventFields = z
  .object({
    name: z.string().trim().min(2, "Give the event a name.").max(120),
    venue: z.string().trim().min(2, "Where is it happening?").max(160),
    description: z.string().trim().max(2000).optional().nullable(),
    startsAt: z.coerce.date({ error: "Pick a start date and time." }),
    endsAt: z.coerce.date().optional().nullable(),
    currency: z.enum(CURRENCIES, { error: "Pick a supported currency." }).default(DEFAULT_CURRENCY),
  })
  .refine((v) => !v.endsAt || v.endsAt > v.startsAt, {
    message: "The event must end after it starts.",
  });

export async function createEvent(input: z.input<typeof eventFields>) {
  return run(eventFields, input, async (data) => {
    const viewer = await requireEventCreator();
    return db.transaction(async (tx) => {
      const [event] = await tx
        .insert(events)
        .values({ ...data, createdBy: viewer.id })
        .returning({ id: events.id });
      await tx.insert(eventOrganizers).values({
        eventId: event.id,
        userId: viewer.id,
        userName: viewer.name,
        userEmail: viewer.email,
        isOwner: true,
        invitedBy: viewer.id,
      });
      return event;
    });
  });
}

export async function updateEvent(input: { id: string } & z.input<typeof eventFields>) {
  const schema = z.intersection(z.object({ id: z.uuid() }), eventFields);
  return run(schema, input, async ({ id, ...data }) => {
    await requireEventManager(id);
    await db.update(events).set(data).where(eq(events.id, id));
  });
}

export async function setEventDisabled(input: { id: string; disabled: boolean }) {
  return run(z.object({ id: z.uuid(), disabled: z.boolean() }), input, async (data) => {
    await requireEventManager(data.id);
    await db.update(events).set({ disabled: data.disabled }).where(eq(events.id, data.id));
  });
}

export async function deleteEvent(input: { id: string }) {
  return run(z.object({ id: z.uuid() }), input, async ({ id }) => {
    await requireEventOwner(id);
    // Entrances, tickets, organizers, scanners and scans cascade.
    await db.delete(events).where(eq(events.id, id));
  });
}
