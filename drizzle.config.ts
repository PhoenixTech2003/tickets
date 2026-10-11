import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/app.ts",
  out: "./src/server/db/migrations",
  // neon_auth is owned by Neon Auth — never let drizzle-kit touch it.
  schemaFilter: ["public"],
  dbCredentials: {
    // Migrations need a direct (non-pooled) connection.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
});
