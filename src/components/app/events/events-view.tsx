"use client";

import Link from "next/link";
import { CalendarPlusIcon, ChevronRightIcon, MapPinIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { useStatus } from "@powersync/react";
import { PageBody, PageHeader, StatStrip } from "@/components/app/page-header";
import { Paginator, useClampPage } from "@/components/app/paginator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEvents, useEventsPage, useEventStats } from "@/lib/powersync/queries";
import { useSession } from "@/lib/powersync/provider";
import type { EventRow } from "@/lib/powersync/schema";
import { formatTime, percent, toDate } from "@/lib/format";
import { EVENT_WHEN, eventHref, eventWhenParser, pageParser, searchParser, type EventWhen } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";

export function EventsView() {
  const { viewer } = useSession();
  const { hasSynced } = useStatus();
  const { data: events, isLoading } = useEvents();
  const { byEvent } = useEventStats();
  const canCreate = viewer.role === "admin" || viewer.role === "organizer";

  const totals = events.reduce(
    (acc, e) => {
      const s = byEvent.get(e.id);
      return { issued: acc.issued + (s?.total ?? 0), admitted: acc.admitted + Number(s?.admitted ?? 0) };
    },
    { issued: 0, admitted: 0 },
  );

  const newEventButton = canCreate && (
    <Button asChild>
      <Link href="/dashboard/events/new">
        <PlusIcon data-icon="inline-start" />
        New event
      </Link>
    </Button>
  );

  return (
    <PageBody>
      <PageHeader
        eyebrow={viewer.role === "admin" ? "All events" : "Your events"}
        title="Events"
        description="Live from this device. Updates as tickets are issued and scanned."
        actions={newEventButton}
      />

      <StatStrip
        stats={[
          { label: "Events", value: events.length },
          { label: "Tickets issued", value: totals.issued },
          { label: "Guests admitted", value: totals.admitted, hint: `${percent(totals.admitted, totals.issued)}%` },
        ]}
      />

      {(isLoading || (!hasSynced && events.length === 0)) && <ListSkeleton />}

      {!isLoading && hasSynced && events.length === 0 && (
        <Empty className="rounded-xl border border-dashed bg-card py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarPlusIcon />
            </EmptyMedia>
            <EmptyTitle className="text-lg">No events yet</EmptyTitle>
            <EmptyDescription>
              {canCreate
                ? "Create your first event, then add entrances and print tickets."
                : "When an admin invites you to organise an event, it will appear here."}
            </EmptyDescription>
          </EmptyHeader>
          {newEventButton && <EmptyContent>{newEventButton}</EmptyContent>}
        </Empty>
      )}

      {events.length > 0 && <EventBrowser stats={byEvent} />}
    </PageBody>
  );
}

type Stats = ReturnType<typeof useEventStats>["byEvent"];

const PAGE_SIZE = 10;
const WHEN_LABELS: Record<EventWhen, string> = { upcoming: "Upcoming", past: "Past", all: "All" };
const EMPTY_COPY: Record<EventWhen, string> = {
  upcoming: "Nothing coming up.",
  past: "No past events.",
  all: "No events.",
};

/** Filter, search and page through events; all three live in the URL. */
function EventBrowser({ stats }: { stats: Stats }) {
  const now = useNow();
  const [when, setWhen] = useQueryState("when", eventWhenParser);
  const [search, setSearch] = useQueryState("q", searchParser);
  const [page, setPage] = useQueryState("page", pageParser);
  const { data: events, total, isLoading } = useEventsPage({ search, when, page, pageSize: PAGE_SIZE, now });
  useClampPage(page, total, PAGE_SIZE, setPage);
  const ended = (e: EventRow) => toDate(e.ends_at ?? e.starts_at).getTime() < now - 6 * 3600_000;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={when}
          onValueChange={(v) => {
            setWhen(EVENT_WHEN.find((w) => w === v) ?? "upcoming");
            setPage(null);
          }}
        >
          <TabsList>
            {EVENT_WHEN.map((w) => (
              <TabsTrigger key={w} value={w}>
                {WHEN_LABELS[w]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <InputGroup className="sm:max-w-72">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(null);
            }}
            placeholder="Search by name or venue"
            aria-label="Search events"
          />
        </InputGroup>
      </div>

      {!isLoading && events.length === 0 ? (
        <Empty className="rounded-xl border border-dashed bg-card py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon />
            </EmptyMedia>
            <EmptyTitle>{search ? "No events match" : EMPTY_COPY[when]}</EmptyTitle>
            <EmptyDescription>
              {search ? `No event name or venue contains “${search}”.` : "Switch to All to see every event."}
            </EmptyDescription>
          </EmptyHeader>
          {when !== "all" && (
            <EmptyContent>
              <Button variant="outline" onClick={() => setWhen("all")}>
                Show all events
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {events.map((event) => (
            <li key={event.id}>
              <EventItem event={event} stats={stats.get(event.id)} muted={ended(event)} />
            </li>
          ))}
        </ul>
      )}
      <Paginator page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} noun="events" />
    </section>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-card">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="size-14 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

const monthFmt = new Intl.DateTimeFormat(undefined, { month: "short" });

function EventItem({
  event,
  stats,
  muted,
}: {
  event: EventRow;
  stats?: { total: number; admitted: number };
  muted?: boolean;
}) {
  const total = stats?.total ?? 0;
  const admitted = Number(stats?.admitted ?? 0);
  const pct = percent(admitted, total);
  const start = toDate(event.starts_at);
  const dim = muted || event.disabled;

  return (
    <Link
      href={eventHref(event.id)}
      className="group flex items-center gap-4 p-3 pr-5 transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:gap-5"
    >
      <div
        className={cn(
          "grid size-14 shrink-0 place-content-center rounded-lg text-center leading-none",
          dim ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        <span className="text-xl font-bold tabular-nums">{start.getDate()}</span>
        <span className="mt-1 text-xs font-medium">{monthFmt.format(start)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("flex items-center gap-2 truncate font-semibold", dim && "text-muted-foreground")}>
          <span className="truncate">{event.name}</span>
          {event.disabled ? <Badge variant="outline">Disabled</Badge> : null}
        </p>
        <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
          {formatTime(event.starts_at)}
          <MapPinIcon className="ml-1.5 size-3.5 shrink-0" />
          <span className="truncate">{event.venue}</span>
        </p>
      </div>
      <div className="hidden w-48 shrink-0 sm:block">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{admitted.toLocaleString()}</span> /{" "}
            {total.toLocaleString()} in
          </span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
