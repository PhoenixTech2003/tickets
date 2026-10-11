"use client";

import { useStatus } from "@powersync/react";
import { cn } from "@/lib/utils";

/**
 * Download progress bar, as recommended by PowerSync: hidden when there is no
 * progress to report, and "Applying server-side changes" once all operations
 * have arrived but are still being applied locally.
 */
export function SyncProgress({ className }: { className?: string }) {
  const progress = useStatus().downloadProgress;
  if (!progress) return null;

  const applying = progress.downloadedOperations === progress.totalOperations;
  const pct = Math.round(progress.downloadedFraction * 100);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between text-sm">
        <span>{applying ? "Applying server-side changes…" : "Downloading from server"}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {progress.downloadedOperations.toLocaleString()} / {progress.totalOperations.toLocaleString()} ops · {pct}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full bg-primary transition-[width] duration-500", applying && "animate-pulse")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
