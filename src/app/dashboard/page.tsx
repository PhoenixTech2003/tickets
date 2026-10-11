import type { Metadata } from "next";
import { EventsView } from "@/components/app/events/events-view";

// Rendered client-side from PowerSync's local SQLite (see PowerSyncProvider),
// so the server never renders this segment and Next can't validate it for
// instant navigation. Navigations inside the app shell are instant anyway.
export const instant = false;

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  return <EventsView />;
}
