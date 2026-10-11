"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStatus } from "@powersync/react";
import { useQueryState } from "nuqs";
import { CalendarClockIcon, Loader2Icon, MapPinIcon, MoreHorizontalIcon, PencilIcon, PowerIcon, Trash2Icon } from "lucide-react";
import { Confirm } from "@/components/app/confirm";
import { ActivityPanel } from "@/components/app/events/activity-panel";
import { EntrancesPanel } from "@/components/app/events/entrances-panel";
import { OrganizersPanel } from "@/components/app/events/organizers-panel";
import { OverviewPanel } from "@/components/app/events/overview-panel";
import { ScannersPanel } from "@/components/app/events/scanners-panel";
import { TicketsPanel } from "@/components/app/events/tickets-panel";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { useAction } from "@/components/app/use-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteEvent, setEventDisabled } from "@/server/actions/events";
import { useEvent, useOrganizers } from "@/lib/powersync/queries";
import { useSession } from "@/lib/powersync/provider";
import { formatDate, formatTime } from "@/lib/format";
import { EVENT_TABS, eventTabParser, type EventTab } from "@/lib/search-params";

const TAB_LABELS: Record<EventTab, string> = {
  overview: "Overview",
  entrances: "Entrances",
  tickets: "Tickets",
  scanners: "Scanners",
  organizers: "Organizers",
  activity: "Activity",
};

export function EventDetail({ eventId }: { eventId: string }) {
  const { viewer } = useSession();
  const router = useRouter();
  const status = useStatus();
  const { event, isLoading } = useEvent(eventId);
  const { data: organizers } = useOrganizers(eventId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useQueryState("tab", eventTabParser);
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const loaded = !!event;

  // Publish the sticky header's height as --sticky-offset so table headers and
  // the tickets sidebar stick just below it rather than underneath.
  useEffect(() => {
    const root = rootRef.current;
    const header = headerRef.current;
    const tabs = tabsRef.current;
    if (!root || !header || !tabs) return;
    // The wrapper is `display: contents` (no box) on phones, where only the tabs stick.
    const update = () => root.style.setProperty("--sticky-offset", `${header.offsetHeight || tabs.offsetHeight}px`);
    const observer = new ResizeObserver(update);
    observer.observe(tabs);
    observer.observe(header);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [loaded]);

  const toggle = useAction(setEventDisabled);
  const remove = useAction(deleteEvent, {
    success: "Event deleted",
    onSuccess: () => router.push("/dashboard"),
  });

  if (isLoading || (!event && !status.hasSynced)) {
    return (
      <PageBody>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </PageBody>
    );
  }

  if (!event) {
    return (
      <PageBody>
        <Empty className="rounded-xl border border-dashed bg-card py-20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {status.dataFlowStatus.downloading ? <Loader2Icon className="animate-spin" /> : <CalendarClockIcon />}
            </EmptyMedia>
            <EmptyTitle className="text-lg">Event not available</EmptyTitle>
            <EmptyDescription>
              It may still be syncing to this device, or it was deleted, or you no longer have access.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </PageBody>
    );
  }

  const disabled = event.disabled === 1;
  const isOwner = organizers.some((o) => o.user_id === viewer.id && o.is_owner === 1);
  const canDelete = viewer.role === "admin" || isOwner;

  return (
    <PageBody>
      <Tabs
        ref={rootRef}
        value={tab}
        onValueChange={(value) => setTab(EVENT_TABS.find((t) => t === value) ?? "overview")}
        className="gap-6"
      >
        {/* From md up the whole header sticks; on phones only the tab bar does (`contents` lets it stick on its own). */}
        <div
          ref={headerRef}
          className="contents md:sticky md:top-0 md:z-20 md:-mx-8 md:-mt-8 md:block md:space-y-4 md:bg-background/95 md:px-8 md:pt-8 md:backdrop-blur"
        >
          <PageHeader
            eyebrow={
              <Link href="/dashboard" className="hover:text-foreground">
                Events
              </Link>
            }
            title={
              <span className="flex flex-wrap items-center gap-3">
                {event.name}
                {disabled && <Badge variant="outline">Disabled</Badge>}
              </span>
            }
            description={
              <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <span className="flex items-center gap-1.5">
                  <CalendarClockIcon className="size-4" />
                  {formatDate(event.starts_at)} · {formatTime(event.starts_at)}
                  {event.ends_at && ` – ${formatTime(event.ends_at)}`}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPinIcon className="size-4" />
                  {event.venue}
                </span>
              </span>
            }
            actions={
              <>
                <Button asChild variant="outline">
                  <Link href={`/dashboard/events/${event.id}/edit`}>
                    <PencilIcon data-icon="inline-start" />
                    Edit
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="More actions">
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={toggle.pending}
                      onSelect={() => toggle.execute({ id: event.id, disabled: !disabled })}
                    >
                      <PowerIcon />
                      {disabled ? "Enable event" : "Disable event"}
                    </DropdownMenuItem>
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                          <Trash2Icon />
                          Delete event
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Confirm
                  open={confirmDelete}
                  onOpenChange={setConfirmDelete}
                  title={`Delete ${event.name}?`}
                  description="This permanently removes its entrances, tickets, scanners and scan history. Printed tickets will stop working."
                  confirmLabel="Delete event"
                  onConfirm={() => remove.execute({ id: event.id })}
                />
              </>
            }
          />

          <TabsList
            ref={tabsRef}
            variant="line"
            className="sticky top-0 z-20 -mx-4 -mt-2 flex h-auto w-auto justify-start overflow-x-auto border-b bg-background/95 px-4 pt-2 pb-[6px] backdrop-blur [scrollbar-width:none] md:static md:-mx-8 md:mt-0 md:bg-transparent md:px-8 md:backdrop-blur-none [&::-webkit-scrollbar]:hidden *:flex-none *:px-3"
          >
            {EVENT_TABS.map((value) => (
              <TabsTrigger key={value} value={value}>
                {TAB_LABELS[value]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {disabled && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
            This event is disabled. Every scan is rejected with &ldquo;Event closed&rdquo; until you enable it again.
          </div>
        )}

        <TabsContent value="overview">
          <OverviewPanel eventId={eventId} />
        </TabsContent>
        <TabsContent value="entrances">
          <EntrancesPanel eventId={eventId} />
        </TabsContent>
        <TabsContent value="tickets">
          <TicketsPanel eventId={eventId} />
        </TabsContent>
        <TabsContent value="scanners">
          <ScannersPanel eventId={eventId} />
        </TabsContent>
        <TabsContent value="organizers">
          <OrganizersPanel eventId={eventId} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityPanel eventId={eventId} />
        </TabsContent>
      </Tabs>
    </PageBody>
  );
}

