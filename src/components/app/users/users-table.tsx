"use client";

import { useQueryState } from "nuqs";
import { SearchIcon } from "lucide-react";
import { useAction } from "@/components/app/use-action";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StickyToolbar } from "@/components/app/sticky-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { changeUserRole } from "@/server/actions/users";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/roles";
import { formatDate, initials } from "@/lib/format";
import { searchParser } from "@/lib/search-params";

type User = { id: string; name: string; email: string; image: string | null; role: Role; createdAt: Date };

export function UsersTable({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const [query, setQuery] = useQueryState("q", searchParser);
  const q = query.trim().toLowerCase();
  const visible = q ? users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : users;
  const counts = ROLES.map((role) => [role, users.filter((u) => u.role === role).length] as const);

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
        <InputGroup className="sm:max-w-72">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" />
        </InputGroup>
      </StickyToolbar>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
              <TableHead className="w-56">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((user) => (
              <UserRow key={user.id} user={user} isSelf={user.id === currentUserId} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function UserRow({ user, isSelf }: { user: User; isSelf: boolean }) {
  // The action calls updateTag, which re-renders this page with fresh data.
  const change = useAction(changeUserRole, { success: "Role updated" });

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
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
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">{formatDate(user.createdAt)}</TableCell>
      <TableCell>
        <Select
          value={user.role}
          disabled={isSelf || change.pending}
          onValueChange={(role) => change.execute({ userId: user.id, role })}
        >
          <SelectTrigger className="w-full">
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
      </TableCell>
    </TableRow>
  );
}
