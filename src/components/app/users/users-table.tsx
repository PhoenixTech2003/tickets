"use client";

import { useState, type ReactNode } from "react";
import { useQueryState } from "nuqs";
import { DicesIcon, KeyRoundIcon, Loader2Icon, PlusIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import { useAction } from "@/components/app/use-action";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Paginator, useClampPage } from "@/components/app/paginator";
import { StickyToolbar } from "@/components/app/sticky-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeUserRole, createAccount, refreshUsers, resetPassword } from "@/server/actions/users";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/roles";
import { formatDate, initials } from "@/lib/format";
import { pageParser, searchParser } from "@/lib/search-params";
import { usernameOf } from "@/lib/usernames";

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
          <CreateAccountDialog />
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
  const username = usernameOf(user.email);

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
          <p className="truncate text-xs text-muted-foreground">{username ? `Username: ${username}` : user.email}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground sm:w-36 sm:text-sm">
        <span className="sm:sr-only">Joined </span>
        {formatDate(user.createdAt)}
      </p>
      <div className="flex items-center justify-end gap-1">
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
        {username && <ResetPasswordDialog userId={user.id} name={user.name} />}
      </div>
    </div>
  );
}

function CreateAccountDialog() {
  const [open, setOpen] = useState(false);
  const create = useAction(createAccount, { success: "Account created" });

  async function onSubmit(form: FormData) {
    const ok = await create.execute({
      name: String(form.get("name") ?? ""),
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? ""),
      role: String(form.get("role") ?? "user"),
    });
    if (ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon data-icon="inline-start" />
          <span className="max-sm:sr-only">New account</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={onSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">New account</DialogTitle>
            <DialogDescription>
              For people without Google. Hand them the username and password; they sign in with those on the sign-in
              page.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="account-name">Name</FieldLabel>
              <Input id="account-name" name="name" required placeholder="Chikondi Banda" />
            </Field>
            <Field>
              <FieldLabel htmlFor="account-username">Username</FieldLabel>
              <Input
                id="account-username"
                name="username"
                required
                autoComplete="off"
                autoCapitalize="none"
                pattern="[a-zA-Z0-9._\-]{3,32}"
                placeholder="chikondi.b"
              />
              <FieldDescription>3–32 letters, numbers, dots, dashes or underscores.</FieldDescription>
            </Field>
            <PasswordField id="account-password" />
            <Field>
              <FieldLabel htmlFor="account-role">Role</FieldLabel>
              <Select name="role" defaultValue="ticket_scanner">
                <SelectTrigger id="account-role" className="w-full">
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
            </Field>
          </FieldGroup>
          <DialogActions pending={create.pending}>Create account</DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const reset = useAction(resetPassword, { success: `Password reset for ${name}` });

  async function onSubmit(form: FormData) {
    const ok = await reset.execute({ userId, password: String(form.get("password") ?? "") });
    if (ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Reset ${name}'s password`}>
          <KeyRoundIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={onSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Reset password</DialogTitle>
            <DialogDescription>
              {name} is signed out on every device and needs the new password to sign back in.
            </DialogDescription>
          </DialogHeader>
          <PasswordField id="reset-password" />
          <DialogActions pending={reset.pending}>Reset password</DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Shown in plain text so the admin can read it out or copy it to hand over. */
function PasswordField({ id }: { id: string }) {
  const [value, setValue] = useState("");
  return (
    <Field>
      <FieldLabel htmlFor={id}>Password</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={id}
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="font-mono"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton onClick={() => setValue(generatePassword())}>
            <DicesIcon />
            Generate
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <FieldDescription>At least 8 characters.</FieldDescription>
    </Field>
  );
}

function DialogActions({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <DialogFooter>
      <DialogClose asChild>
        <Button type="button" variant="ghost">
          Cancel
        </Button>
      </DialogClose>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" />}
        {children}
      </Button>
    </DialogFooter>
  );
}

// No look-alike characters (0/O, 1/l/I), so it's easy to read out or copy by hand.
const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generatePassword(length = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]).join("");
}
