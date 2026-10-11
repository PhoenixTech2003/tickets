import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { authUser } from "@/server/db/schema/auth";
import { eventOrganizers, eventScanners } from "@/server/db/schema/app";
import { parseRole, type Role } from "@/lib/roles";

export type Viewer = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
};

/**
 * Data Access Layer entry point. Resolves the session cookie, then reads the
 * role fresh from `neon_auth.user` (the admin plugin's column) so promotions
 * and demotions apply immediately instead of after the session cookie cache
 * expires. Memoised per request with React `cache`.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const { data } = await auth.getSession();
  if (!data?.user) return null;

  const [row] = await db
    .select({ role: authUser.role, banned: authUser.banned })
    .from(authUser)
    .where(eq(authUser.id, data.user.id))
    .limit(1);
  if (row?.banned) return null;

  return {
    id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    image: data.user.image ?? null,
    role: parseRole(row?.role),
  };
});

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  return viewer;
}

/** Where a signed-in user lands, based on what they are allowed to see. */
export async function homePathFor(viewer: Viewer) {
  if (viewer.role === "admin" || viewer.role === "organizer") return "/dashboard";
  if (await isInvitedOrganizer(viewer.id)) return "/dashboard";
  if (viewer.role === "ticket_scanner" || (await hasScannerAssignment(viewer.id))) return "/scan";
  return "/pending";
}

export async function isInvitedOrganizer(userId: string) {
  const rows = await db
    .select({ id: eventOrganizers.id })
    .from(eventOrganizers)
    .where(eq(eventOrganizers.userId, userId))
    .limit(1);
  return rows.length > 0;
}

export async function hasScannerAssignment(userId: string) {
  const rows = await db
    .select({ id: eventScanners.id })
    .from(eventScanners)
    .where(and(eq(eventScanners.userId, userId), eq(eventScanners.disabled, false)))
    .limit(1);
  return rows.length > 0;
}

/** Dashboard = admins, organizers, and users invited to organise an event. */
export async function canUseDashboard(viewer: Viewer) {
  if (viewer.role === "admin" || viewer.role === "organizer") return true;
  if (viewer.role === "ticket_scanner") return false;
  return isInvitedOrganizer(viewer.id);
}
