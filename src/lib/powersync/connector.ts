import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from "@powersync/web";

/**
 * Bridges PowerSync to our Next.js backend. Both endpoints authenticate with
 * the Neon Auth session cookie, so no tokens are stored in the browser.
 */
export class BackendConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const res = await fetch("/api/powersync/token", { cache: "no-store" });
    if (res.status === 401) return null;
    if (!res.ok) throw new Error(`PowerSync token request failed: ${res.status}`);
    const body: { endpoint: string; token: string; expiresAt: string } = await res.json();
    return { endpoint: body.endpoint, token: body.token, expiresAt: new Date(body.expiresAt) };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const batch = await database.getCrudBatch(100);
    if (!batch) return;

    const res = await fetch("/api/powersync/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ops: batch.crud.map((entry) => ({
          op: entry.op,
          type: entry.table,
          id: entry.id,
          data: entry.opData ?? {},
        })),
      }),
    });

    // Network and server errors throw so PowerSync retries with backoff.
    // A 400 means the batch can never succeed; discard it so it can't jam
    // the queue (the server already rejects disallowed rows individually).
    if (!res.ok && res.status !== 400) {
      throw new Error(`Upload failed: ${res.status}`);
    }
    await batch.complete();
  }
}
