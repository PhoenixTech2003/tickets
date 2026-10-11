import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app/app-sidebar";
import { DashboardSkeleton } from "@/components/app/skeletons";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PowerSyncProvider } from "@/lib/powersync/provider";
import { canUseDashboard, getViewer, homePathFor } from "@/server/auth/viewer";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardGate>{children}</DashboardGate>
    </Suspense>
  );
}

async function DashboardGate({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  if (!(await canUseDashboard(viewer))) redirect(await homePathFor(viewer));
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  return (
    <PowerSyncProvider viewer={viewer} fallback={<DashboardSkeleton />}>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar />
        <SidebarInset className="md:peer-data-[variant=inset]:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]">{children}</SidebarInset>
      </SidebarProvider>
    </PowerSyncProvider>
  );
}
