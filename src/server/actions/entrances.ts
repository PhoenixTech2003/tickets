"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { entrances } from "@/server/db/schema/app";
import { requireEventManager } from "@/server/auth/permissions";
import { run, UserFacingError } from "./result";

const fields = {
  name: z.string().trim().min(1, "Name the entrance.").max(80),
  description: z.string().trim().max(500).optional().nullable(),
};

export async function createEntrance(input: { eventId: string; name: string; description?: string | null }) {
  return run(z.object({ eventId: z.uuid(), ...fields }), input, async (data) => {
    await requireEventManager(data.eventId);
    const [row] = await db.insert(entrances).values(data).returning({ id: entrances.id });
    return row;
  });
}

/** Loads the entrance and authorises against its event — never trust a client eventId. */
async function managedEntrance(id: string) {
  const [row] = await db
    .select({ id: entrances.id, eventId: entrances.eventId })
    .from(entrances)
    .where(eq(entrances.id, id));
  if (!row) throw new UserFacingError("That entrance no longer exists.");
  await requireEventManager(row.eventId);
  return row;
}

export async function updateEntrance(input: { id: string; name: string; description?: string | null }) {
  return run(z.object({ id: z.uuid(), ...fields }), input, async ({ id, ...data }) => {
    await managedEntrance(id);
    await db.update(entrances).set(data).where(eq(entrances.id, id));
  });
}

export async function setEntranceDisabled(input: { id: string; disabled: boolean }) {
  return run(z.object({ id: z.uuid(), disabled: z.boolean() }), input, async ({ id, disabled }) => {
    await managedEntrance(id);
    await db.update(entrances).set({ disabled }).where(eq(entrances.id, id));
  });
}

export async function deleteEntrance(input: { id: string }) {
  return run(z.object({ id: z.uuid() }), input, async ({ id }) => {
    await managedEntrance(id);
    // Tickets and scanners tied to it fall back to "any entrance" (FK set null).
    await db.delete(entrances).where(eq(entrances.id, id));
  });
}
