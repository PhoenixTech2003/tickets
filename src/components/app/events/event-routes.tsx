"use client";

import { useQueryState } from "nuqs";
import { EditEvent } from "@/components/app/events/edit-event";
import { EventDetail } from "@/components/app/events/event-detail";
import { eventIdParser } from "@/lib/search-params";

/** `/dashboard/event?id=…` */
export function EventDetailRoute() {
  const [id] = useQueryState("id", eventIdParser);
  return <EventDetail key={id} eventId={id} />;
}

/** `/dashboard/event/edit?id=…` */
export function EditEventRoute() {
  const [id] = useQueryState("id", eventIdParser);
  return <EditEvent key={id} eventId={id} />;
}
