import type { Metadata } from "next";
import { EditEvent } from "@/components/app/events/edit-event";

// Rendered client-side from PowerSync's local SQLite (see PowerSyncProvider),
// so the server never renders this segment and Next can't validate it for
// instant navigation.
export const instant = false;

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: PageProps<"/dashboard/events/[eventId]/edit">) {
  const { eventId } = await params;
  return <EditEvent eventId={eventId} />;
}
