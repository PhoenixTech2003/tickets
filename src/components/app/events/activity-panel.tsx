"use client";

import { ActivityIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useEntrances, useScans } from "@/lib/powersync/queries";
import { formatRelative, formatTime } from "@/lib/format";
import { TONE_BADGE, verdictOf } from "@/lib/verdicts";
import { cn } from "@/lib/utils";

/** Realtime feed of scans across every entrance, straight from PowerSync. */
export function ActivityPanel({ eventId }: { eventId: string }) {
  const { data: scans } = useScans(eventId, 100);
  const { data: entrances } = useEntrances(eventId);
  const entranceName = (id: string | null) => entrances.find((e) => e.id === id)?.name ?? "Any entrance";

  if (scans.length === 0) {
    return (
      <Empty className="rounded-xl border border-dashed bg-card py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ActivityIcon />
          </EmptyMedia>
          <EmptyTitle className="text-lg">Quiet at the door</EmptyTitle>
          <EmptyDescription>Scans appear here the moment they happen.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Card className="rounded-xl py-2">
      <CardContent className="divide-y px-2">
        {scans.map((scan) => {
          const verdict = verdictOf(scan.result);
          const overruled = scan.client_result && scan.client_result !== scan.result;
          return (
            <div key={scan.id} className="flex items-center gap-4 px-3 py-3 animate-in fade-in slide-in-from-top-1">
              <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{formatTime(scan.scanned_at)}</span>
              <span className="w-24 shrink-0 ticket-code">{scan.code}</span>
              <Badge variant="outline" className={cn("shrink-0", TONE_BADGE[verdict.tone])}>
                {verdict.label}
              </Badge>
              {overruled && (
                <span className="hidden text-xs text-muted-foreground md:inline">
                  device said {verdictOf(scan.client_result!).label.toLowerCase()}
                </span>
              )}
              <span className="ml-auto truncate text-right text-sm text-muted-foreground">
                {entranceName(scan.entrance_id)} · {scan.scanner_name}
                <span className="hidden lg:inline"> · {formatRelative(scan.scanned_at)}</span>
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
