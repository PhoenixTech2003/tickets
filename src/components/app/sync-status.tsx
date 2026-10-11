"use client";

import Link from "next/link";
import { useStatus } from "@powersync/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { deriveSyncState } from "@/lib/powersync/diagnostics";
import { cn } from "@/lib/utils";

const DOT = { success: "bg-success", warning: "bg-warning", destructive: "bg-destructive" };

/** Compact live indicator; links to the full sync status page. */
export function SyncStatus({ href, className }: { href: string; className?: string }) {
  const status = useStatus();
  const state = deriveSyncState(status);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            className,
          )}
        >
          <span className="relative flex size-2">
            {state.key === "live" && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", DOT[state.tone])} />}
            <span className={cn("relative inline-flex size-2 rounded-full", DOT[state.tone])} />
          </span>
          {state.label}
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        {status.lastSyncedAt ? `Last synced ${status.lastSyncedAt.toLocaleTimeString()}` : "Not synced yet"} · open sync status
      </TooltipContent>
    </Tooltip>
  );
}
