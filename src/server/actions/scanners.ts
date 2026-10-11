"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { authUser } from "@/server/db/schema/auth";
import { entrances, eventScanners } from "@/server/db/schema/app";
import { requireEventManager } from "@/server/auth/permissions";
import { demoteScannerIfUnassigned, promoteToScanner } from "@/server/auth/roles";
import { USERS_TAG } from "@/server/queries/users";
import { run, UserFacingError } from "./result";

async function assertEntranceInEvent(entranceId: string | null, eventId: string) {
  if (!entranceId) return;
  const [row] = await db
    .select({ id: entrances.id })
    .from(entrances)
    .where(and(eq(entrances.id, entranceId), eq(entrances.eventId, eventId)));
  if (!row) throw new UserFacingError("That entrance isn't part of this event.");
}

export async function addScanner(input: { eventId: string; userId: string; entranceId: string | null }) {
  const schema = z.object({
    eventId: z.uuid(),
    userId: z.string().min(1),
    entranceId: z.uuid().nullable(),
  });
  return run(schema, input, async (data) => {
    const actor = await requireEventManager(data.eventId);
    await assertEntranceInEvent(data.entranceId, data.eventId);
    const [user] = await db
      .select({ name: authUser.name, email: authUser.email })
      .from(authUser)
      .where(eq(authUser.id, data.userId));
    if (!user) throw new UserFacingError("That person hasn't signed up yet.");

    const inserted = await db
      .insert(eventScanners)
      .values({
        ...data,
        userName: user.name,
        userEmail: user.email,
        addedBy: actor.id,
      })
      .onConflictDoNothing()
      .returning({ id: eventScanners.id });
    if (inserted.length === 0) throw new UserFacingError(`${user.name} already scans for this event.`);

    await promoteToScanner(data.userId);
    updateTag(USERS_TAG);
  });
}

async function managedScanner(id: string) {
  const [row] = await db
    .select({ eventId: eventScanners.eventId, userId: eventScanners.userId })
    .from(eventScanners)
    .where(eq(eventScanners.id, id));
  if (!row) throw new UserFacingError("That scanner was already removed.");
  await requireEventManager(row.eventId);
  return row;
}

export async function updateScannerEntrance(input: { id: string; entranceId: string | null }) {
  return run(z.object({ id: z.uuid(), entranceId: z.uuid().nullable() }), input, async (data) => {
    const row = await managedScanner(data.id);
    await assertEntranceInEvent(data.entranceId, row.eventId);
    await db
      .update(eventScanners)
      .set({ entranceId: data.entranceId })
      .where(eq(eventScanners.id, data.id));
  });
}

export async function setScannerDisabled(input: { id: string; disabled: boolean }) {
  return run(z.object({ id: z.uuid(), disabled: z.boolean() }), input, async (data) => {
    await managedScanner(data.id);
    await db
      .update(eventScanners)
      .set({ disabled: data.disabled })
      .where(eq(eventScanners.id, data.id));
  });
}

export async function removeScanner(input: { id: string }) {
  return run(z.object({ id: z.uuid() }), input, async ({ id }) => {
    const row = await managedScanner(id);
    await db.delete(eventScanners).where(eq(eventScanners.id, id));
    await demoteScannerIfUnassigned(row.userId);
    updateTag(USERS_TAG);
  });
}
