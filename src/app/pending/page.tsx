import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRoundIcon } from "lucide-react";
import { Brand } from "@/components/app/brand";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer, homePathFor } from "@/server/auth/viewer";
import { PendingSignOut } from "./sign-out-button";

export const metadata: Metadata = { title: "Access needed" };

export default function PendingPage() {
  return (
    <div className="flex flex-1 flex-col px-4 py-5 sm:px-6">
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
    <Empty className="max-w-md rounded-xl border bg-card p-6 sm:p-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <KeyRoundIcon />
        </EmptyMedia>
        <EmptyTitle className="text-lg">You need access</EmptyTitle>
        <EmptyDescription>
          Your account <span className="text-foreground">{viewer.email}</span> is set up, but it isn&apos;t linked to
          any events yet. Contact an admin or the organizer of your event and ask them to add this email as an
          organizer or ticket scanner. Refresh this page once they have.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <PendingSignOut />
      </EmptyContent>
    </Empty>
  );
}
