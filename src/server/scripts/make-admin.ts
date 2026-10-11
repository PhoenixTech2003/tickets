/**
 * Bootstraps the first admin: `bun run make-admin you@example.com`.
 * Sign in with Google once first so the account exists in neon_auth.user.
 * Writes the Better Auth admin plugin's `role` column directly, because no
 * admin exists yet to call `admin.setRole`. After this, manage roles in the UI.
 */
import "dotenv/config";
import { Pool } from "@neondatabase/serverless";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: bun run make-admin <email>");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query<{ name: string }>(
  `update neon_auth."user" set role = 'admin' where lower(email) = $1 returning name`,
  [email],
);
await pool.end();

if (rows.length === 0) {
  console.error(`No user with email ${email}. Sign in with Google once, then rerun.`);
  process.exit(1);
}
console.log(`✓ ${rows[0].name} <${email}> is now an admin.`);
