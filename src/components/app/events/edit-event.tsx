"use client";

import Link from "next/link";
import { CalendarClockIcon } from "lucide-react";
import { EventForm } from "@/components/app/events/event-form";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvent } from "@/lib/powersync/queries";
import { eventHref } from "@/lib/search-params";

export function EditEvent({ eventId }: { eventId: string }) {
  const { event, isLoading } = useEvent(eventId);

  return (
    <PageBody>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <Link href="/dashboard" className="hover:text-foreground">
              Events
            </Link>
            /
            <Link href={eventHref(eventId)} className="truncate hover:text-foreground">
              {event?.name ?? "Event"}
            </Link>
          </span>
        }
        title="Edit event"
        description="Changes sync to every organizer and scanner straight away."
      />
      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : event ? (
        <EventForm key={event.id} event={event} />
      ) : (
        <Empty className="rounded-xl border border-dashed bg-card py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarClockIcon />
            </EmptyMedia>
            <EmptyTitle className="text-lg">Event not available</EmptyTitle>
            <EmptyDescription>It may still be syncing to this device, or it was deleted.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </PageBody>
  );
}
