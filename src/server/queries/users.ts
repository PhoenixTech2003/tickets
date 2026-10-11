import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { desc } from "drizzle-orm";
import { db } from "@/server/db";
import { authUser } from "@/server/db/schema/auth";
import { requireAdmin } from "@/server/auth/permissions";
import { parseRole } from "@/lib/roles";

export const USERS_TAG = "users";

/**
 * The user directory changes rarely and isn't part of the PowerSync data set,
 * so it is served from the Next.js cache and invalidated with `updateTag`
 * whenever an admin changes a role. Authorisation happens outside the cached
 * scope so the cache entry can never be reached without it.
 */
export async function listUsers() {
  await requireAdmin();
  return cachedUsers();
}

async function cachedUsers() {
  "use cache";
  cacheTag(USERS_TAG);
  cacheLife("minutes");
  const rows = await db
    .select({
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      image: authUser.image,
      role: authUser.role,
      createdAt: authUser.createdAt,
    })
    .from(authUser)
    .orderBy(desc(authUser.createdAt))
    .limit(500);
  return rows.map((r) => ({ ...r, role: parseRole(r.role) }));
}
