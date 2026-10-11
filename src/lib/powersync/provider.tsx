"use client";

import { createContext, use, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { PowerSyncContext } from "@powersync/react";
import type { Viewer } from "@/server/auth/viewer";
import { BackendConnector } from "./connector";
import { attachDiagnostics } from "./diagnostics";
import { getPowerSync, type LocalDb } from "./db";

type Session = { viewer: Viewer; db: LocalDb; disconnectAndClear: () => Promise<void> };
const SessionContext = createContext<Session | null>(null);

const subscribeNoop = () => () => {};

/**
 * Opens the user's local SQLite database and keeps it syncing. PowerSync
 * needs browser APIs (workers, OPFS/IndexedDB), so nothing below this
 * provider renders on the server: `fallback` is shown until hydration.
 */
export function PowerSyncProvider({
  viewer,
  fallback,
  children,
}: {
  viewer: Viewer;
  fallback: ReactNode;
  children: ReactNode;
}) {
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);
  if (!isClient) return fallback;
  return <ClientPowerSync viewer={viewer}>{children}</ClientPowerSync>;
}

function ClientPowerSync({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  const [instance] = useState(() => getPowerSync(viewer.id));

  useEffect(() => {
    const detach = attachDiagnostics(instance.powerSync);
    void instance.powerSync.connect(new BackendConnector());
    return detach;
  }, [instance]);

  return (
    <PowerSyncContext.Provider value={instance.powerSync}>
      <SessionContext
        value={{
          viewer,
          db: instance.db,
          disconnectAndClear: () => instance.powerSync.disconnectAndClear(),
        }}
      >
        {children}
      </SessionContext>
    </PowerSyncContext.Provider>
  );
}

export function useSession() {
  const session = use(SessionContext);
  if (!session) throw new Error("useSession must be used inside <PowerSyncProvider>");
  return session;
}
