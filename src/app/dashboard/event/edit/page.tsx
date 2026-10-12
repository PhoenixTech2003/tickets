import type { Metadata } from "next";
import { EditEventRoute } from "@/components/app/events/event-routes";

// Rendered client-side from PowerSync's local SQLite (see PowerSyncProvider),
// so the server never renders this segment and Next can't validate it for
// instant navigation. The page is static: the event id is read from `?id=`.
export const instant = false;

export const metadata: Metadata = { title: "Edit event" };

export default function EditEventPage() {
  return <EditEventRoute />;
}
