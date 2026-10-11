import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { SyncStatusView } from "@/components/app/sync/sync-status-view";

// Rendered client-side from PowerSync's local SQLite (see PowerSyncProvider),
// so the server never renders this segment and Next can't validate it for
// instant navigation. Navigations inside the app shell are instant anyway.
export const instant = false;

export const metadata: Metadata = { title: "Sync status" };

export default function DashboardSyncPage() {
  return (
    <PageBody>
      <SyncStatusView
        header={
          <PageHeader
            eyebrow="This device"
            title="Sync status"
            description="Connection health, pending uploads and the data held locally by PowerSync on this browser."
          />
        }
      />
    </PageBody>
  );
}
