import "server-only";
import net from "node:net";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as app from "./schema/app";
import * as auth from "./schema/auth";

export const schema = { ...app, ...auth };

// Node gives each address only 250 ms when a host has both IPv6 and IPv4
// addresses. On networks without working IPv6 and with a slow route to Neon,
// the IPv4 attempt never finishes and every query fails with an `ErrorEvent`
// (ETIMEDOUT).
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

// The WebSocket pool supports interactive transactions (ticket generation,
// scan reconciliation); the HTTP driver does not.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle({ client: pool, schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
