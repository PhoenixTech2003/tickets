"use client";

import Link from "next/link";
import { CalendarPlusIcon, ChevronRightIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { useStatus } from "@powersync/react";
import { PageBody, PageHeader, StatStrip } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvents, useEventStats } from "@/lib/powersync/queries";
import { useSession } from "@/lib/powersync/provider";
import type { EventRow } from "@/lib/powersync/schema";
import { formatTime, percent, toDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";

export function EventsView() {
  const { viewer } = useSession();
  const { hasSynced } = useStatus();
  const { data: events, isLoading } = useEvents();
  const { byEvent } = useEventStats();
  const canCreate = viewer.role === "admin" || viewer.role === "organizer";

  const now = useNow();
  const upcoming = events.filter((e) => toDate(e.ends_at ?? e.starts_at).getTime() >= now - 6 * 3600_000);
  const past = events.filter((e) => !upcoming.includes(e));
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

      {upcoming.length > 0 && <EventList title="Upcoming" events={upcoming} stats={byEvent} />}
      {past.length > 0 && <EventList title="Past" events={past} stats={byEvent} muted />}
    </PageBody>
  );
}

type Stats = ReturnType<typeof useEventStats>["byEvent"];

function EventList({ title, events, stats, muted }: { title: string; events: EventRow[]; stats: Stats; muted?: boolean }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">
        {title} <span className="font-normal text-muted-foreground">{events.length}</span>
      </h2>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {events.map((event) => (
          <li key={event.id}>
            <EventItem event={event} stats={stats.get(event.id)} muted={muted} />
          </li>
        ))}
      </ul>
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
      href={`/dashboard/events/${event.id}`}
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
