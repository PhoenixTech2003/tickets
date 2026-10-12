"use client";

import { useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/app/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/** Sidebar chrome. Reads the sidebar cookie on the client so the layout stays static. */
export function DashboardShell({ children }: { children: ReactNode }) {
  const [defaultOpen] = useState(() => !document.cookie.split("; ").includes("sidebar_state=false"));
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset className="md:peer-data-[variant=inset]:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]">{children}</SidebarInset>
    </SidebarProvider>
  );
}
