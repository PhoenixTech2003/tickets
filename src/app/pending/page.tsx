import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HourglassIcon } from "lucide-react";
import { Brand } from "@/components/app/brand";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer, homePathFor } from "@/server/auth/viewer";
import { PendingSignOut } from "./sign-out-button";

export const metadata: Metadata = { title: "Awaiting access" };

export default function PendingPage() {
  return (
    <div className="flex flex-1 flex-col px-6 py-5">
      <Brand />
      <div className="grid flex-1 place-items-center">
        <Suspense fallback={<Skeleton className="h-64 w-full max-w-md rounded-xl" />}>
          <Pending />
        </Suspense>
      </div>
    </div>
  );
}

async function Pending() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  const home = await homePathFor(viewer);
  if (home !== "/pending") redirect(home);

  return (
    <Empty className="max-w-md rounded-xl border bg-card p-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HourglassIcon />
        </EmptyMedia>
        <EmptyTitle className="text-lg">You&apos;re on the list</EmptyTitle>
        <EmptyDescription>
          Signed in as <span className="text-foreground">{viewer.email}</span>. An admin needs to make you an
          organizer, or an organizer needs to add you as a ticket scanner. This page updates when you refresh.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <PendingSignOut />
      </EmptyContent>
    </Empty>
  );
}
