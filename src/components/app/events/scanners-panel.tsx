"use client";

import { useState } from "react";
import { Loader2Icon, ScanLineIcon, Trash2Icon, UserPlusIcon } from "lucide-react";
import { Confirm } from "@/components/app/confirm";
import { EntranceSelect } from "@/components/app/entrance-select";
import { UserPicker } from "@/components/app/user-picker";
import { useAction } from "@/components/app/use-action";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { addScanner, removeScanner, setScannerDisabled, updateScannerEntrance } from "@/server/actions/scanners";
import type { UserHit } from "@/server/actions/users";
import { useEntrances, useScanners } from "@/lib/powersync/queries";
import type { EntranceRow, ScannerRow } from "@/lib/powersync/schema";
import { initials } from "@/lib/format";
import { loginLabel } from "@/lib/usernames";

export function ScannersPanel({ eventId }: { eventId: string }) {
  const { data: scanners } = useScanners(eventId);
  const { data: entrances } = useEntrances(eventId);
  const addButton = <AddScannerDialog eventId={eventId} entrances={entrances} existing={scanners.map((s) => s.user_id)} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">
          Scanners only see the scanning screen. Tie one to an entrance to station them there, or leave it open
          to scan at any door.
        </p>
        {addButton}
      </div>

      {scanners.length === 0 ? (
        <Empty className="rounded-xl border border-dashed bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScanLineIcon />
            </EmptyMedia>
            <EmptyTitle className="text-lg">No scanners yet</EmptyTitle>
            <EmptyDescription>Add anyone who has signed in. They&apos;ll become a ticket scanner.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{addButton}</EmptyContent>
        </Empty>
      ) : (
        <Card className="rounded-xl py-2">
          <CardContent className="divide-y px-2">
            {scanners.map((scanner) => (
              <ScannerRowView key={scanner.id} scanner={scanner} entrances={entrances} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ScannerRowView({ scanner, entrances }: { scanner: ScannerRow; entrances: EntranceRow[] }) {
  const [confirm, setConfirm] = useState(false);
  const move = useAction(updateScannerEntrance, { success: "Station updated" });
  const toggle = useAction(setScannerDisabled);
  const remove = useAction(removeScanner, { success: `${scanner.user_name} removed` });
  const disabled = scanner.disabled === 1;

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-3 py-3 sm:flex">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="size-8">
          <AvatarFallback className="text-xs">{initials(scanner.user_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <span className="truncate">{scanner.user_name}</span>
            {disabled && <Badge variant="outline">Disabled</Badge>}
          </p>
          <p className="truncate text-xs text-muted-foreground">{loginLabel(scanner.user_email)}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:order-last">
        <Switch
          checked={!disabled}
          disabled={toggle.pending}
          aria-label={disabled ? "Enable scanner" : "Disable scanner"}
          onCheckedChange={(active) => toggle.execute({ id: scanner.id, disabled: !active })}
        />
        <Button variant="ghost" size="icon-sm" aria-label="Remove scanner" onClick={() => setConfirm(true)}>
          <Trash2Icon />
        </Button>
        <Confirm
          open={confirm}
          onOpenChange={setConfirm}
          title={`Remove ${scanner.user_name}?`}
          description="They lose scanning access for this event straight away. If it was their only assignment, they return to a plain user."
          confirmLabel="Remove"
          onConfirm={() => remove.execute({ id: scanner.id })}
        />
      </div>
      <EntranceSelect
        entrances={entrances}
        value={scanner.entrance_id}
        onChange={(entranceId) => move.execute({ id: scanner.id, entranceId })}
        anyLabel="Any entrance (roaming)"
        disabled={move.pending}
        ariaLabel={`${scanner.user_name}'s station`}
        className="col-span-2 w-full sm:w-52"
      />
    </div>
  );
}

function AddScannerDialog({ eventId, entrances, existing }: { eventId: string; entrances: EntranceRow[]; existing: string[] }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserHit | null>(null);
  const [entranceId, setEntranceId] = useState<string | null>(null);
  const add = useAction(addScanner, { success: () => `${user?.name ?? "Scanner"} can now scan tickets` });

  async function submit() {
    if (!user) return;
    if (await add.execute({ eventId, userId: user.id, entranceId })) {
      setOpen(false);
      setUser(null);
      setEntranceId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlusIcon data-icon="inline-start" />
          Add scanner
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add a ticket scanner</DialogTitle>
          <DialogDescription>Search everyone who has signed in, by name or email.</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Person</FieldLabel>
            <UserPicker excludeIds={existing} selected={user} onSelect={setUser} />
          </Field>
          <Field>
            <FieldLabel htmlFor="scanner-entrance">Station</FieldLabel>
            <EntranceSelect
              id="scanner-entrance"
              entrances={entrances}
              value={entranceId}
              onChange={setEntranceId}
              anyLabel="Any entrance (roaming)"
            />
            <FieldDescription>Roaming scanners admit every valid ticket, whatever its entrance.</FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} disabled={!user || add.pending}>
            {add.pending && <Loader2Icon className="animate-spin" />}
            {user ? `Add ${user.name.split(" ")[0]}` : "Add scanner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
