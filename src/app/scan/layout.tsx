import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { ScanShell } from "@/components/app/scan/scan-shell";
import { PowerSyncProvider } from "@/lib/powersync/provider";
import { canUseDashboard, getViewer, hasScannerAssignment } from "@/server/auth/viewer";

export const metadata: Metadata = { title: "Scan tickets" };

const spinner = (
  <div className="grid flex-1 place-items-center">
    <Loader2Icon className="size-6 animate-spin text-primary" />
  </div>
);

export default function ScanLayout({ children }: LayoutProps<"/scan">) {
  return (
    <Suspense fallback={spinner}>
      <ScanGate>{children}</ScanGate>
    </Suspense>
  );
}

async function ScanGate({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  const canManage = await canUseDashboard(viewer);
  // Scanners, plus admins/organizers who may scan their own events.
  if (!canManage && viewer.role !== "ticket_scanner" && !(await hasScannerAssignment(viewer.id))) {
    redirect("/pending");
  }

  return (
    <PowerSyncProvider viewer={viewer} fallback={spinner}>
      <ScanShell canManage={canManage}>{children}</ScanShell>
    </PowerSyncProvider>
  );
}
