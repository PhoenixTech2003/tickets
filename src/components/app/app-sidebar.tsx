"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarRangeIcon, ChevronsUpDownIcon, CircleQuestionMarkIcon, LogOutIcon, RadioTowerIcon, ScanLineIcon, UsersIcon } from "lucide-react";
import { Brand } from "@/components/app/brand";
import { SyncStatus } from "@/components/app/sync-status";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { signOut } from "@/components/app/sign-out";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useEvents } from "@/lib/powersync/queries";
import { useSession } from "@/lib/powersync/provider";
import { ROLE_LABELS } from "@/lib/roles";
import { formatShortDate, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { eventHref } from "@/lib/search-params";
import { loginLabel } from "@/lib/usernames";

export function AppSidebar() {
  const { viewer, disconnectAndClear } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openEventId = pathname.startsWith("/dashboard/event") ? searchParams.get("id") : null;
  const { data: events, isLoading } = useEvents();

  const nav = [
    { href: "/dashboard", label: "Events", icon: CalendarRangeIcon, exact: true },
    { href: "/scan", label: "Scan tickets", icon: ScanLineIcon },
    ...(viewer.role === "admin" ? [{ href: "/dashboard/users", label: "People & roles", icon: UsersIcon }] : []),
    { href: "/dashboard/sync", label: "Sync status", icon: RadioTowerIcon },
    { href: "/docs", label: "Docs", icon: CircleQuestionMarkIcon },
  ];

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <Brand href="/dashboard" className="group-data-[collapsible=icon]:[&>span:last-child]:hidden" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map(({ href, label, icon: Icon, exact }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={label}
                    isActive={exact ? pathname === href : pathname.startsWith(href)}
                  >
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Your events</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading && [0, 1, 2].map((i) => <SidebarMenuSkeleton key={i} />)}
              {events.slice(0, 12).map((event) => {
                const href = eventHref(event.id);
                return (
                  <SidebarMenuItem key={event.id}>
                    <SidebarMenuButton asChild isActive={openEventId === event.id} className="h-auto py-1.5">
                      <Link href={href}>
                        <span className={cn("size-1.5 shrink-0 rounded-full bg-current", event.disabled && "opacity-35")} />
                        {/* The name takes the ellipsis; the date never shrinks. */}
                        <span className="min-w-0 flex-1 truncate" title={event.name}>
                          {event.name}
                        </span>
                        <span className="shrink-0 font-mono text-[0.65rem] text-muted-foreground">
                          {formatShortDate(event.starts_at)}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3">
        <div className="flex items-center justify-between px-1 group-data-[collapsible=icon]:hidden">
          <SyncStatus href="/dashboard/sync" />
          <ThemeToggle />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-8 rounded-lg">
                    {viewer.image && <AvatarImage src={viewer.image} alt="" />}
                    <AvatarFallback className="rounded-lg">{initials(viewer.name)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{viewer.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{ROLE_LABELS[viewer.role]}</span>
                  </div>
                  <ChevronsUpDownIcon className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="font-medium">{viewer.name}</p>
                  <p className="text-xs text-muted-foreground">{loginLabel(viewer.email)}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => signOut(disconnectAndClear)}>
                  <LogOutIcon />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
