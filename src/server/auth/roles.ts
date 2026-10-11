import "server-only";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { authUser } from "@/server/db/schema/auth";
import { eventScanners } from "@/server/db/schema/app";
import { parseRole, type Role } from "@/lib/roles";

/**
 * Sets a user's role in the Better Auth admin plugin.
 *
 * `admin`/`user` go through the plugin API (`auth.admin.setRole`), which also
 * enforces that the caller is an admin. Managed Better Auth only ships the two
 * built-in roles, so the custom `organizer` and `ticket_scanner` roles — and
 * any call made on behalf of a non-admin (an organizer adding a scanner) — are
 * written to the plugin's own `role` column. Callers must authorise first.
 */
export async function setUserRole(userId: string, role: Role, opts: { viaAdminApi: boolean }) {
  if (opts.viaAdminApi && (role === "admin" || role === "user")) {
    const { error } = await auth.admin.setRole({ userId, role });
    if (!error) return;
    console.warn("[roles] admin.setRole failed, writing role column directly", error);
  }
  await db.update(authUser).set({ role }).where(eq(authUser.id, userId));
}

export async function getUserRole(userId: string) {
  const [row] = await db
    .select({ role: authUser.role })
    .from(authUser)
    .where(eq(authUser.id, userId));
  return row ? parseRole(row.role) : null;
}

/** Adding a scanner promotes a plain `user` to `ticket_scanner`. */
export async function promoteToScanner(userId: string) {
  if ((await getUserRole(userId)) === "user") {
    await setUserRole(userId, "ticket_scanner", { viaAdminApi: false });
  }
}

/** Removing a scanner's last assignment returns them to `user`. */
export async function demoteScannerIfUnassigned(userId: string) {
  if ((await getUserRole(userId)) !== "ticket_scanner") return;
  const remaining = await db
    .select({ id: eventScanners.id })
    .from(eventScanners)
    .where(eq(eventScanners.userId, userId))
    .limit(1);
  if (remaining.length === 0) await setUserRole(userId, "user", { viaAdminApi: false });
}
