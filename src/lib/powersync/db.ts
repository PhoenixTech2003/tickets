"use client";

import { PowerSyncDatabase } from "@powersync/web";
import { wrapPowerSyncWithDrizzle } from "@powersync/drizzle-driver";
import { AppSchema, drizzleSchema } from "./schema";

const WORKER = "/@powersync/worker.js"; // copied to public/ by `powersync-web copy-assets`

function open(userId: string) {
  const powerSync = new PowerSyncDatabase({
    schema: AppSchema,
    // One SQLite file per user, so a shared door tablet never mixes data sets.
    database: { dbFilename: `tickets-${userId}.db`, worker: WORKER },
    sync: { worker: WORKER },
  });
  return { userId, powerSync, db: wrapPowerSyncWithDrizzle(powerSync, { schema: drizzleSchema }) };
}

let instance: ReturnType<typeof open> | null = null;

/** Browser-only singleton for the signed-in user. */
export function getPowerSync(userId: string) {
  if (instance?.userId === userId) return instance;
  void instance?.powerSync.close();
  instance = open(userId);
  return instance;
}

export type LocalDb = ReturnType<typeof open>["db"];
