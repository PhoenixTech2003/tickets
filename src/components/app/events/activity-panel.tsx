"use client";

import { ActivityIcon, SearchIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { Paginator, useClampPage } from "@/components/app/paginator";
import { StickyToolbar } from "@/components/app/sticky-toolbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useEntrances, useScansPage } from "@/lib/powersync/queries";
import { formatRelative, formatTime } from "@/lib/format";
import { pageParser, searchParser } from "@/lib/search-params";
import { TONE_BADGE, verdictOf } from "@/lib/verdicts";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

/** Realtime feed of scans across every entrance, straight from PowerSync. */
export function ActivityPanel({ eventId }: { eventId: string }) {
  const [search, setSearch] = useQueryState("q", searchParser);
  const [page, setPage] = useQueryState("page", pageParser);
  const { data: scans, total, isLoading } = useScansPage(eventId, { search, page, pageSize: PAGE_SIZE });
  const { data: entrances } = useEntrances(eventId);
  const entranceName = (id: string | null) => entrances.find((e) => e.id === id)?.name ?? "Any entrance";
  useClampPage(page, total, PAGE_SIZE, setPage);

  if (!isLoading && total === 0 && !search) {
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
    <Card className="gap-0 rounded-xl pt-0">
      <StickyToolbar className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Newest first. New scans appear at the top of page 1.</p>
        <InputGroup className="sm:max-w-56">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 6));
              setPage(null);
            }}
            placeholder="Find a code"
            aria-label="Find scans by ticket code"
            className="ticket-code uppercase placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
          />
        </InputGroup>
      </StickyToolbar>
      <CardContent>
        {!isLoading && scans.length === 0 ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon />
              </EmptyMedia>
              <EmptyTitle>No scans match</EmptyTitle>
              <EmptyDescription>No ticket code containing &ldquo;{search.toUpperCase()}&rdquo; has been scanned.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="divide-y">
            {scans.map((scan) => {
              const verdict = verdictOf(scan.result);
              const overruled = scan.client_result && scan.client_result !== scan.result;
              return (
                <div key={scan.id} className="flex items-center gap-4 py-3 animate-in fade-in slide-in-from-top-1">
                  <span className="w-14 shrink-0 text-xs text-muted-foreground tabular-nums">{formatTime(scan.scanned_at)}</span>
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
          </div>
        )}
        <Paginator page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} noun="scans" className="mt-4" />
      </CardContent>
    </Card>
  );
}
