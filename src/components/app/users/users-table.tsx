"use client";

import { useQueryState } from "nuqs";
import { Loader2Icon, RefreshCwIcon, SearchIcon } from "lucide-react";
import { useAction } from "@/components/app/use-action";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Paginator, useClampPage } from "@/components/app/paginator";
import { StickyToolbar } from "@/components/app/sticky-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeUserRole, refreshUsers } from "@/server/actions/users";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/roles";
import { formatDate, initials } from "@/lib/format";
import { pageParser, searchParser } from "@/lib/search-params";

const PAGE_SIZE = 25;

type User = { id: string; name: string; email: string; image: string | null; role: Role; createdAt: Date };

export function UsersTable({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const [query, setQuery] = useQueryState("q", searchParser);
  const q = query.trim().toLowerCase();
  const visible = q ? users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : users;
  const counts = ROLES.map((role) => [role, users.filter((u) => u.role === role).length] as const);
  const [page, setPage] = useQueryState("page", pageParser);
  useClampPage(page, visible.length, PAGE_SIZE, setPage);
  const pageRows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Card className="gap-0 rounded-xl pt-0">
      <StickyToolbar className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {counts.map(([role, n]) => (
            <Badge key={role} variant="outline" className="font-normal">
              {ROLE_LABELS[role]} <span className="font-mono">{n}</span>
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <InputGroup className="flex-1 sm:w-72 sm:flex-none">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(null);
              }}
              placeholder="Search name or email"
              aria-label="Search people"
            />
          </InputGroup>
          <RefreshButton />
        </div>
      </StickyToolbar>
      <CardContent>
        <div className="divide-y">
          {pageRows.map((user) => (
            <UserRow key={user.id} user={user} isSelf={user.id === currentUserId} />
          ))}
        </div>
        {visible.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No one&apos;s name or email contains &ldquo;{query}&rdquo;.</p>
        )}
        <Paginator page={page} pageSize={PAGE_SIZE} total={visible.length} onPageChange={setPage} noun="people" className="mt-4" />
      </CardContent>
    </Card>
  );
}

function RefreshButton() {
  // The list is cached for a few minutes; this fetches new sign-ups straight away.
  const refresh = useAction(refreshUsers, { success: "People list refreshed" });
  return (
    <Button variant="outline" onClick={() => refresh.execute(undefined)} disabled={refresh.pending}>
      {refresh.pending ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
      <span className="max-sm:sr-only">Refresh</span>
    </Button>
  );
}

function UserRow({ user, isSelf }: { user: User; isSelf: boolean }) {
  // The action calls updateTag, which re-renders this page with fresh data.
  const change = useAction(changeUserRole, { success: "Role updated" });

  return (
    // Stacked on phones (person, then joined + role); one row from sm up.
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 py-3 sm:flex">
      <div className="col-span-2 flex min-w-0 items-center gap-3 sm:flex-1">
        <Avatar className="size-9">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">
            {user.name} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground sm:w-36 sm:text-sm">
        <span className="sm:sr-only">Joined </span>
        {formatDate(user.createdAt)}
      </p>
      <Select
        value={user.role}
        disabled={isSelf || change.pending}
        onValueChange={(role) => change.execute({ userId: user.id, role })}
      >
        <SelectTrigger className="w-40 sm:w-56" aria-label={`${user.name}'s role`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {ROLE_LABELS[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
