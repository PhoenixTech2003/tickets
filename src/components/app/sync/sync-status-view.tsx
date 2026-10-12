"use client";

import { useOffline } from "next/offline";
import { useState, type ReactNode } from "react";
import { usePowerSync, useQuery, useStatus } from "@powersync/react";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CloudDownloadIcon,
  CloudUploadIcon,
  DatabaseIcon,
  InfoIcon,
  Loader2Icon,
  RadioTowerIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  WifiOffIcon,
} from "lucide-react";
import { Confirm } from "@/components/app/confirm";
import { SyncProgress } from "@/components/app/sync/sync-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BackendConnector } from "@/lib/powersync/connector";
import { deriveSyncState, useDiagnosticEvents, useUploadQueue } from "@/lib/powersync/diagnostics";
import { useSession } from "@/lib/powersync/provider";
import { useNow } from "@/hooks/use-now";
import { formatRelative, formatTime } from "@/lib/format";
import { TONE_BADGE } from "@/lib/verdicts";
import { cn } from "@/lib/utils";

const LOCAL_TABLES = ["events", "entrances", "tickets", "scans", "event_scanners", "event_organizers", "ticket_batches"] as const;
const COUNT_SQL = `SELECT ${LOCAL_TABLES.map((t) => `(SELECT count(*) FROM ${t}) AS ${t}`).join(", ")}`;

/**
 * Diagnostics screen built from PowerSync's recommendations: connection
 * state, upload/download activity, first-sync and last-sync times, download
 * progress, the upload queue, errors, and per-stream status.
 */
export function SyncStatusView({ header }: { header: ReactNode }) {
  const now = useNow(15_000);
  const status = useStatus();
  const state = deriveSyncState(status, useOffline());
  const queue = useUploadQueue();
  const flow = status.dataFlowStatus;

  const HeroIcon = { error: CircleAlertIcon, connecting: Loader2Icon, offline: WifiOffIcon, syncing: RefreshCwIcon, live: RadioTowerIcon }[state.key];

  return (
    <div className="space-y-8">
      {header}

      <Card className={cn("gap-6 rounded-xl border shadow-none", TONE_BADGE[state.tone])}>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <HeroIcon className={cn("size-10 shrink-0", (state.key === "connecting" || state.key === "syncing") && "animate-spin [animation-duration:2s]")} strokeWidth={2} />
          <div className="flex-1 space-y-1 text-foreground">
            <h2 className="text-2xl font-bold sm:text-3xl">{state.label}</h2>
            <p className="text-muted-foreground">{describe(state.key, queue.count)}</p>
          </div>
          <Actions pending={queue.count} />
        </CardContent>
        <SyncProgress className="px-6" />
      </Card>

      <section className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card lg:grid-cols-3">
        <Flag label="Connected" on={status.connected} hint={status.connecting ? "Connecting now" : undefined} />
        <Flag label="Uploading" on={flow.uploading} hint="Sending local changes through uploadData" />
        <Flag label="Downloading" on={flow.downloading} hint="Receiving changes from the service" />
        <Flag label="Initial sync complete" on={status.hasSynced === true} hint={status.hasSynced ? "This device has a full copy" : "Waiting for first full sync"} />
        <Tile label="Last synced" value={status.lastSyncedAt ? formatRelative(status.lastSyncedAt, now) : "Never"} hint={status.lastSyncedAt ? status.lastSyncedAt.toLocaleString() : undefined} />
        <Tile
          label="Upload queue"
          value={`${queue.count.toLocaleString()} pending`}
          hint={queue.size != null ? `${formatBytes(queue.size)} waiting in ps_crud` : undefined}
        />
      </section>

      {(flow.downloadError || flow.uploadError) && (
        <Card className="gap-3 rounded-xl border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <CircleAlertIcon className="size-4" /> Current errors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-xs">
            {flow.downloadError && <p>download: {String(flow.downloadError)}</p>}
            {flow.uploadError && <p>upload: {String(flow.uploadError)}</p>}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <StreamsCard now={now} />
        <LocalDataCard />
      </div>
      <EventLogCard />
    </div>
  );
}

function describe(key: ReturnType<typeof deriveSyncState>["key"], pending: number) {
  const queued = pending ? ` ${pending} change${pending === 1 ? "" : "s"} will upload when possible.` : "";
  switch (key) {
    case "error":
      return `PowerSync reported an error and will retry automatically.${queued}`;
    case "connecting":
      return "Opening a connection to the PowerSync service…";
    case "offline":
      return `Working from this device's copy. Scans are still verified locally.${queued}`;
    case "syncing":
      return "Exchanging changes with the server.";
    case "live":
      return "Connected and up to date. Changes arrive in realtime.";
  }
}

function Actions({ pending }: { pending: number }) {
  const db = usePowerSync();
  const { disconnectAndClear } = useSession();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
      await db.connect(new BackendConnector());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={busy} onClick={() => run(() => db.disconnect())}>
        {busy ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
        Reconnect
      </Button>
      <Button variant="ghost" disabled={busy} onClick={() => setConfirm(true)}>
        <RotateCcwIcon />
        Re-download
      </Button>
      <Confirm
        open={confirm}
        onOpenChange={setConfirm}
        title="Re-download everything?"
        description={
          pending > 0
            ? `This device still has ${pending} change${pending === 1 ? "" : "s"} that haven't uploaded. Clearing now will lose ${pending === 1 ? "it" : "them"}. Reconnect and wait for the queue to empty first.`
            : "Clears this device's local copy and downloads a fresh one from the server."
        }
        confirmLabel={pending > 0 ? "Clear anyway" : "Clear and re-download"}
        onConfirm={() => run(disconnectAndClear)}
      />
    </div>
  );
}

function Flag({ label, on, hint }: { label: string; on: boolean; hint?: string }) {
  return (
    <div className="-mt-px -ml-px min-w-0 border-t border-l p-4 sm:p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-2 text-xl font-bold sm:text-2xl">
        <span className={cn("size-2.5 rounded-full", on ? "bg-success" : "bg-muted-foreground/30")} />
        {on ? "Yes" : "No"}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="-mt-px -ml-px min-w-0 border-t border-l p-4 sm:p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold break-words sm:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StreamsCard({ now }: { now: number }) {
  const streams = useStatus().syncStreams ?? [];
  return (
    <Card className="gap-4 rounded-xl">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Sync streams</CardTitle>
        <CardDescription>The data sets this account receives, decided by the server from your role and assignments.</CardDescription>
      </CardHeader>
      <CardContent>
        {streams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stream information yet. It appears once connected.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stream</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Last synced</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {streams.map(({ subscription, progress }) => (
                <TableRow key={`${subscription.name}:${JSON.stringify(subscription.parameters)}`}>
                  <TableCell>
                    <p className="font-mono text-sm break-all">{subscription.name}</p>
                    <p className="text-xs text-muted-foreground">{subscription.isDefault ? "auto-subscribed" : "explicit"}</p>
                  </TableCell>
                  <TableCell>
                    {progress && progress.downloadedFraction < 1 ? (
                      <Badge variant="outline" className={TONE_BADGE.warning}>
                        {Math.round(progress.downloadedFraction * 100)}%
                      </Badge>
                    ) : (
                      <Badge variant="outline" className={subscription.hasSynced ? TONE_BADGE.success : undefined}>
                        {subscription.hasSynced ? "Synced" : subscription.active ? "Pending" : "Inactive"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {subscription.lastSyncedAt ? formatRelative(subscription.lastSyncedAt, now) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function LocalDataCard() {
  const { data } = useQuery<Record<(typeof LOCAL_TABLES)[number], number>>(COUNT_SQL);
  const counts = data[0];
  return (
    <Card className="gap-4 rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <DatabaseIcon className="size-4 text-muted-foreground" /> On this device
        </CardTitle>
        <CardDescription>Rows in the local SQLite copy. These are what scanning checks against when offline.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LOCAL_TABLES.map((table) => (
          <div key={table} className="rounded-lg border p-3">
            <p className="font-mono text-xs text-muted-foreground">{table}</p>
            <p className="text-2xl font-bold tabular-nums">{(counts?.[table] ?? 0).toLocaleString()}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EventLogCard() {
  const events = useDiagnosticEvents();
  const icons = { info: InfoIcon, success: CircleCheckIcon, error: CircleAlertIcon };
  return (
    <Card className="gap-4 rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <CloudUploadIcon className="size-4 text-muted-foreground" />
          <CloudDownloadIcon className="-ml-1 size-4 text-muted-foreground" /> Session log
        </CardTitle>
        <CardDescription>Connection changes and each distinct error since this tab opened.</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
        ) : (
          <ol className="divide-y">
            {events.map((event) => {
              const Icon = icons[event.tone];
              return (
                <li key={event.id} className="flex items-start gap-3 py-2.5 text-sm">
                  <Icon
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      event.tone === "error" ? "text-destructive" : event.tone === "success" ? "text-success" : "text-muted-foreground",
                    )}
                  />
                  <span className="min-w-0 flex-1 break-words">{event.message}</span>
                  <span className="font-mono text-xs text-muted-foreground">{formatTime(event.at)}</span>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
