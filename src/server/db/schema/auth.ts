import { boolean, pgSchema, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Read model of the tables Neon Auth (managed Better Auth) owns in the
 * `neon_auth` schema. Drizzle never migrates this schema (see
 * `schemaFilter` in drizzle.config.ts) — it is only used to search users and
 * to read the admin plugin's `role` column as the source of truth for RBAC.
 */
export const neonAuth = pgSchema("neon_auth");

export const authUser = neonAuth.table("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  image: text("image"),
  role: text("role"),
  banned: boolean("banned"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull(),
});
