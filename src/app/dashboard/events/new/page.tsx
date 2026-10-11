import type { Metadata } from "next";
import Link from "next/link";
import { EventForm } from "@/components/app/events/event-form";
import { PageBody, PageHeader } from "@/components/app/page-header";

// The dashboard layout renders children only inside PowerSyncProvider, which
// renders nothing below it on the server, so Next can't validate this segment
// for instant navigation.
export const instant = false;

export const metadata: Metadata = { title: "New event" };

export default function NewEventPage() {
  return (
    <PageBody>
      <PageHeader
        eyebrow={
          <Link href="/dashboard" className="hover:text-foreground">
            Events
          </Link>
        }
        title="New event"
        description="You can add entrances, tickets and scanners once it's created."
      />
      <EventForm />
    </PageBody>
  );
}
