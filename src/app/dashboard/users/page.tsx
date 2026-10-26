import { Suspense } from "react";
import type { Metadata } from "next";
import { AccessDeclined } from "@/components/app/access-declined";
import { OfflineFallback } from "@/components/app/offline-fallback";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { UsersTable } from "@/components/app/users/users-table";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/server/auth/viewer";
import { listUsers } from "@/server/queries/users";

// The dashboard layout renders children only inside PowerSyncProvider, which
// renders nothing below it on the server, so Next can't validate this segment
// for instant navigation. The page streams behind its own Suspense skeleton.
export const instant = false;

export const metadata: Metadata = { title: "People & roles" };

export default function UsersPage() {
  return (
    <PageBody>
      <PageHeader
        eyebrow="Admin"
        title="People & roles"
        description="Everyone who has signed in with Google or been given a username account. Roles are stored by the Better Auth admin plugin and take effect immediately."
      />
      <Suspense
        fallback={
          <OfflineFallback message="People and roles load from the server. They'll appear when this device is back online.">
            <Skeleton className="h-96 rounded-xl" />
          </OfflineFallback>
        }
      >
        <Users />
      </Suspense>
    </PageBody>
  );
}

async function Users() {
  const viewer = await getViewer();
  // Declines anyone the admin plugin hasn't granted the admin role.
  if (viewer?.role !== "admin") return <AccessDeclined />;
  const users = await listUsers();
  return <UsersTable users={users} currentUserId={viewer.id} />;
}
