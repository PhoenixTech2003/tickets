"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { authUser } from "@/server/db/schema/auth";
import { eventOrganizers } from "@/server/db/schema/app";
import { requireAdmin } from "@/server/auth/permissions";
import { parseRole } from "@/lib/roles";
import { run, UserFacingError } from "./result";

/**
 * Inviting gives a signed-up user access to manage one event. It does not
 * change their platform role — only admins grant `organizer`, which is what
 * allows creating new events.
 */
export async function inviteOrganizer(input: { eventId: string; userId: string }) {
  return run(z.object({ eventId: z.uuid(), userId: z.string().min(1) }), input, async (data) => {
    const admin = await requireAdmin();
    const [user] = await db
      .select({ name: authUser.name, email: authUser.email, role: authUser.role })
      .from(authUser)
      .where(eq(authUser.id, data.userId));
    if (!user) throw new UserFacingError("That person hasn't signed up yet.");
    if (parseRole(user.role) === "ticket_scanner") {
      throw new UserFacingError(
        `${user.name} is a ticket scanner. Change their role before inviting them as an organizer.`,
      );
    }

    const inserted = await db
      .insert(eventOrganizers)
      .values({
        eventId: data.eventId,
        userId: data.userId,
        userName: user.name,
        userEmail: user.email,
        invitedBy: admin.id,
      })
      .onConflictDoNothing()
      .returning({ id: eventOrganizers.id });
    if (inserted.length === 0) throw new UserFacingError(`${user.name} already organises this event.`);
  });
}

export async function revokeOrganizer(input: { id: string }) {
  return run(z.object({ id: z.uuid() }), input, async ({ id }) => {
    await requireAdmin();
    const [row] = await db
      .select({ isOwner: eventOrganizers.isOwner })
      .from(eventOrganizers)
      .where(eq(eventOrganizers.id, id));
    if (!row) throw new UserFacingError("That invite was already revoked.");
    if (row.isOwner) throw new UserFacingError("The event owner can't be removed.");
    await db.delete(eventOrganizers).where(eq(eventOrganizers.id, id));
  });
}
