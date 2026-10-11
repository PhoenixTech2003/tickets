import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { SyncStatusView } from "@/components/app/sync/sync-status-view";
import { Button } from "@/components/ui/button";

// Rendered client-side from PowerSync's local SQLite (see PowerSyncProvider),
// so the server never renders this segment and Next can't validate it for
// instant navigation. Navigations inside the app shell are instant anyway.
export const instant = false;

export const metadata: Metadata = { title: "Sync status" };

export default function ScannerSyncPage() {
  return (
    <main className="mx-auto w-full max-w-4xl p-4 sm:p-8">
      <SyncStatusView
        header={
          <header className="space-y-4">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link href="/scan">
                <ArrowLeftIcon data-icon="inline-start" />
                Back to scanning
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">Sync status</h1>
            <p className="text-muted-foreground">
              Check this before doors open: once the initial sync is complete, this device can verify tickets
              without a connection.
            </p>
          </header>
        }
      />
    </main>
  );
}
