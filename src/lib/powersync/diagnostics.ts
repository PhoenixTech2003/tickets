"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePowerSync, useStatus } from "@powersync/react";
import type { AbstractPowerSyncDatabase, SyncStatus } from "@powersync/web";

/**
 * Session diagnostics, following PowerSync's production-readiness guidance:
 * record connection transitions and each *distinct* upload/download error
 * once (the status keeps re-emitting an error until it clears), and keep a
 * local trail so it is visible offline on the sync status page.
 */

export type DiagnosticEvent = {
  id: number;
  at: Date;
  tone: "info" | "success" | "error";
  message: string;
};

const MAX_EVENTS = 50;
let events: DiagnosticEvent[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

function record(tone: DiagnosticEvent["tone"], message: string) {
  events = [{ id: nextId++, at: new Date(), tone, message }, ...events].slice(0, MAX_EVENTS);
  listeners.forEach((l) => l());
}

/** Attach once per database (from the PowerSync provider). Returns a disposer. */
export function attachDiagnostics(db: AbstractPowerSyncDatabase) {
  let connected: boolean | null = null;
  let hasSynced = db.currentStatus.hasSynced ?? false;
  let lastDownloadError = "";
  let lastUploadError = "";

  return db.registerListener({
    statusChanged: (status: SyncStatus) => {
      if (status.connected !== connected) {
        if (connected !== null || status.connected) {
          record(status.connected ? "success" : "info", status.connected ? "Connected to PowerSync" : "Disconnected");
        }
        connected = status.connected;
      }
      if (status.hasSynced && !hasSynced) {
        hasSynced = true;
        record("success", "First full sync complete");
      }

      const downloadError = status.dataFlowStatus.downloadError ? String(status.dataFlowStatus.downloadError) : "";
      if (downloadError && downloadError !== lastDownloadError) {
        console.error("[powersync] download failed", status.dataFlowStatus.downloadError);
        record("error", `Download failed: ${downloadError}`);
      }
      lastDownloadError = downloadError;

      const uploadError = status.dataFlowStatus.uploadError ? String(status.dataFlowStatus.uploadError) : "";
      if (uploadError && uploadError !== lastUploadError) {
        console.error("[powersync] upload failed", status.dataFlowStatus.uploadError);
        record("error", `Upload failed: ${uploadError}`);
      }
      lastUploadError = uploadError;
    },
  });
}

export function useDiagnosticEvents() {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => events,
    () => events,
  );
}

/** Pending local writes awaiting `uploadData` (rows in the internal `ps_crud` table). */
export function useUploadQueue() {
  const db = usePowerSync();
  const status = useStatus();
  const [stats, setStats] = useState<{ count: number; size: number | null }>({ count: 0, size: null });

  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      db
        .getUploadQueueStats(true)
        .then((s) => !cancelled && setStats({ count: s.count, size: s.size }))
        .catch(() => {});
    refresh();
    const id = setInterval(refresh, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // Refresh immediately whenever the upload state flips.
  }, [db, status.dataFlowStatus.uploading]);

  return stats;
}

export type SyncState = {
  key: "error" | "connecting" | "offline" | "syncing" | "live";
  label: string;
  tone: "destructive" | "warning" | "success";
};

/** Indicator precedence recommended by PowerSync: errors → connecting → offline → transferring → connected. */
export function deriveSyncState(status: SyncStatus): SyncState {
  const flow = status.dataFlowStatus;
  if (flow.downloadError || flow.uploadError) return { key: "error", label: "Sync error", tone: "destructive" };
  if (status.connecting) return { key: "connecting", label: "Connecting", tone: "warning" };
  if (!status.connected) return { key: "offline", label: "Offline", tone: "destructive" };
  if (flow.uploading || flow.downloading) return { key: "syncing", label: "Syncing", tone: "warning" };
  return { key: "live", label: "Live", tone: "success" };
}
