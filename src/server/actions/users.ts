"use server";

import { asc, eq, ilike, or } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { authUser } from "@/server/db/schema/auth";
import { eventScanners } from "@/server/db/schema/app";
import { AuthorizationError, requireActor, requireAdmin } from "@/server/auth/permissions";
import { canUseDashboard } from "@/server/auth/viewer";
import { setUserRole } from "@/server/auth/roles";
import { USERS_TAG } from "@/server/queries/users";
import { parseRole, ROLES } from "@/lib/roles";
import { run, UserFacingError } from "./result";

export type UserHit = { id: string; name: string; email: string; image: string | null; role: string };

/** Search everyone who has signed up, by name or email. */
export async function searchUsers(input: { query: string; field?: "any" | "email" }) {
  const schema = z.object({
    query: z.string().trim().min(2, "Type at least two characters.").max(100),
    field: z.enum(["any", "email"]).default("any"),
  });
  return run(schema, input, async ({ query, field }): Promise<UserHit[]> => {
    const viewer = await requireActor();
    if (!(await canUseDashboard(viewer))) throw new AuthorizationError();
    const pattern = `%${query.replace(/[%_\\]/g, "\\$&")}%`;
    const rows = await db
      .select({
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        image: authUser.image,
        role: authUser.role,
      })
      .from(authUser)
      .where(
        field === "email"
          ? ilike(authUser.email, pattern)
          : or(ilike(authUser.email, pattern), ilike(authUser.name, pattern)),
      )
      .orderBy(asc(authUser.name))
      .limit(8);
    return rows.map((r) => ({ ...r, role: parseRole(r.role) }));
  });
}

export async function changeUserRole(input: { userId: string; role: string }) {
  return run(z.object({ userId: z.string().min(1), role: z.enum(ROLES) }), input, async (data) => {
    const admin = await requireAdmin();
    if (data.userId === admin.id && data.role !== "admin") {
      throw new UserFacingError("You can't remove your own admin access.");
    }
    if (data.role === "user") {
      const [assignment] = await db
        .select({ id: eventScanners.id })
        .from(eventScanners)
        .where(eq(eventScanners.userId, data.userId))
        .limit(1);
      if (assignment) {
        throw new UserFacingError("Remove this person's scanner assignments first.");
      }
    }
    await setUserRole(data.userId, data.role, { viaAdminApi: true });
    updateTag(USERS_TAG);
  });
}

/** Drops the cached people list so the page re-renders with fresh data. */
export async function refreshUsers() {
  return run(z.undefined(), undefined, async () => {
    await requireAdmin();
    updateTag(USERS_TAG);
  });
}
