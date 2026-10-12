"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LayoutDashboardIcon, LogOutIcon } from "lucide-react";
import { Brand } from "@/components/app/brand";
import { signOut } from "@/components/app/sign-out";
import { SyncStatus } from "@/components/app/sync-status";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAccess } from "@/components/app/viewer-gate";
import { useSession } from "@/lib/powersync/provider";

/** Minimal chrome for door devices: brand, sync state, theme, sign out. */
export function ScanShell({ children }: { children: ReactNode }) {
  const { viewer, disconnectAndClear } = useSession();
  const canManage = useAccess().dashboard;
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/70 px-4 py-3 backdrop-blur-xl sm:px-6">
        <Brand href={canManage ? "/dashboard" : "/scan"} className="max-[400px]:[&>span:last-child]:sr-only" />
        <div className="ml-auto flex items-center gap-1.5">
          <SyncStatus href="/scan/sync" />
          {canManage && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="ghost" size="icon" aria-label="Dashboard">
                  <Link href="/dashboard">
                    <LayoutDashboardIcon />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Dashboard</TooltipContent>
            </Tooltip>
          )}
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => signOut(disconnectAndClear)}>
                <LogOutIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out {viewer.name}</TooltipContent>
          </Tooltip>
        </div>
      </header>
      {children}
    </div>
  );
}
