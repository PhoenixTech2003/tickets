"use client";

import type { ReactNode } from "react";
import { useOffline } from "next/offline";
import { WifiOffIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

/** Suspense fallback for server-rendered sections: explains the wait when the device is offline. */
export function OfflineFallback({ message, children }: { message: string; children: ReactNode }) {
  if (!useOffline()) return children;
  return (
    <Empty className="rounded-xl border border-dashed bg-card py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WifiOffIcon />
        </EmptyMedia>
        <EmptyTitle className="text-lg">Waiting for a connection</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
