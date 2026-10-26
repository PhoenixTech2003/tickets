"use server";

import { asc, eq, ilike, or } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { authUser } from "@/server/db/schema/auth";
import { eventScanners } from "@/server/db/schema/app";
import { auth } from "@/server/auth";
import { AuthorizationError, requireActor, requireAdmin } from "@/server/auth/permissions";
import { canUseDashboard } from "@/server/auth/viewer";
import { setUserRole } from "@/server/auth/roles";
import { USERS_TAG } from "@/server/queries/users";
import { parseRole, ROLES } from "@/lib/roles";
import { USERNAME_PATTERN, usernameOf, usernameToEmail } from "@/lib/usernames";
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

const password = z.string().min(8, "Use at least 8 characters.").max(128);

/** Creates a username + password account for someone without Google sign-in. */
export async function createAccount(input: { name: string; username: string; password: string; role: string }) {
  const schema = z.object({
    name: z.string().trim().min(1, "Enter a name.").max(100),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(USERNAME_PATTERN, "Usernames are 3–32 letters, numbers, dots, dashes or underscores."),
    password,
    role: z.enum(ROLES),
  });
  return run(schema, input, async (data) => {
    await requireAdmin();
    const { data: created, error } = await auth.admin.createUser({
      email: usernameToEmail(data.username),
      password: data.password,
      name: data.name,
      // The address can't receive mail, so mark it verified up front.
      data: { emailVerified: true },
    });
    if (error || !created) {
      if (error?.code?.includes("ALREADY_EXISTS")) throw new UserFacingError("That username is taken.");
      throw new Error(error?.message ?? "admin.createUser returned no user");
    }
    if (data.role !== "user") await setUserRole(created.user.id, data.role, { viaAdminApi: true });
    updateTag(USERS_TAG);
  });
}

/** Sets a new password on a username account and signs it out everywhere. */
export async function resetPassword(input: { userId: string; password: string }) {
  return run(z.object({ userId: z.string().min(1), password }), input, async (data) => {
    await requireAdmin();
    const [user] = await db.select({ email: authUser.email }).from(authUser).where(eq(authUser.id, data.userId));
    // Google accounts have no password to reset.
    if (!user || !usernameOf(user.email)) throw new UserFacingError("Only username accounts have a password.");
    const { error } = await auth.admin.setUserPassword({ userId: data.userId, newPassword: data.password });
    if (error) throw new Error(error.message);
    await auth.admin.revokeUserSessions({ userId: data.userId });
  });
}

/** Drops the cached people list so the page re-renders with fresh data. */
export async function refreshUsers() {
  return run(z.undefined(), undefined, async () => {
    await requireAdmin();
    updateTag(USERS_TAG);
  });
}
