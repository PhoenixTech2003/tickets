import { DashboardShell } from "@/components/app/dashboard-shell";
import { DashboardSkeleton } from "@/components/app/skeletons";
import { ViewerGate } from "@/components/app/viewer-gate";

// Static on purpose: the gate runs on the client from the viewer cached on this
// device, so the shell prerenders, prefetches in full and loads offline.
// Data access is still authorized on the server (PowerSync token, actions).
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <ViewerGate area="dashboard" fallback={<DashboardSkeleton />}>
      <DashboardShell>{children}</DashboardShell>
    </ViewerGate>
  );
}
