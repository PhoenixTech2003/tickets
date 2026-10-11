"use client";

import { useState, type ReactNode } from "react";
import { DoorOpenIcon, Loader2Icon, MoreVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Confirm } from "@/components/app/confirm";
import { useAction } from "@/components/app/use-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createEntrance, deleteEntrance, setEntranceDisabled, updateEntrance } from "@/server/actions/entrances";
import { useEntrances, useEntranceStats, useScanners } from "@/lib/powersync/queries";
import type { EntranceRow } from "@/lib/powersync/schema";
import { percent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function EntrancesPanel({ eventId }: { eventId: string }) {
  const { data: entrances } = useEntrances(eventId);
  const { data: stats } = useEntranceStats(eventId);
  const { data: scanners } = useScanners(eventId);
  const byEntrance = new Map(stats.map((s) => [s.entranceId, s]));
  const unassigned = byEntrance.get(null);

  const addButton = (
    <EntranceDialog
      eventId={eventId}
      trigger={
        <Button>
          <PlusIcon data-icon="inline-start" />
          Add entrance
        </Button>
      }
    />
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">
          Tickets tied to an entrance are only admitted there. Guests at the wrong door are redirected by name.
          An event with no entrances admits every ticket at any door.
        </p>
        {addButton}
      </div>

      {entrances.length === 0 ? (
        <Empty className="rounded-xl border border-dashed bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <DoorOpenIcon />
            </EmptyMedia>
            <EmptyTitle className="text-lg">Single-door event</EmptyTitle>
            <EmptyDescription>No entrances yet, so every ticket is valid at any door.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{addButton}</EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entrances.map((entrance) => (
            <EntranceCard
              key={entrance.id}
              entrance={entrance}
              stats={byEntrance.get(entrance.id)}
              scannerCount={scanners.filter((s) => s.entrance_id === entrance.id && s.disabled === 0).length}
            />
          ))}
          {unassigned && (
            <Card className="gap-3 rounded-xl border-dashed bg-transparent shadow-none ring-0">
              <CardHeader>
                <h3 className="text-lg font-semibold">Any door</h3>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {Number(unassigned.admitted).toLocaleString()} of {unassigned.total.toLocaleString()} any-door tickets
                admitted. These work at every entrance.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function EntranceCard({
  entrance,
  stats,
  scannerCount,
}: {
  entrance: EntranceRow;
  stats?: { total: number; admitted: number };
  scannerCount: number;
}) {
  const [confirm, setConfirm] = useState(false);
  const toggle = useAction(setEntranceDisabled);
  const remove = useAction(deleteEntrance, { success: "Entrance deleted" });
  const disabled = entrance.disabled === 1;
  const total = stats?.total ?? 0;
  const admitted = Number(stats?.admitted ?? 0);

  return (
    <Card className={cn("gap-4 rounded-xl", disabled && "opacity-60")}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold">{entrance.name}</h3>
            {disabled && <Badge variant="outline">Closed</Badge>}
          </div>
          {entrance.description && <p className="text-sm text-muted-foreground">{entrance.description}</p>}
        </div>
        <div className="flex items-center gap-1">
          <Switch
            checked={!disabled}
            disabled={toggle.pending}
            aria-label={disabled ? "Open entrance" : "Close entrance"}
            onCheckedChange={(open) => toggle.execute({ id: entrance.id, disabled: !open })}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Entrance actions">
                <MoreVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <EntranceDialog
                eventId={entrance.event_id}
                entrance={entrance}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <PencilIcon />
                    Rename
                  </DropdownMenuItem>
                }
              />
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2 border-t pt-4 text-sm">
        <Figure label="Tickets" value={total} />
        <Figure label="Admitted" value={`${percent(admitted, total)}%`} />
        <Figure label="Scanners" value={scannerCount} />
      </CardContent>
      <Confirm
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${entrance.name}?`}
        description="Its tickets and scanners become valid at any entrance. To stop admissions here instead, close the entrance with the switch."
        onConfirm={() => remove.execute({ id: entrance.id })}
      />
    </Card>
  );
}

function Figure({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  );
}

function EntranceDialog({ eventId, entrance, trigger }: { eventId: string; entrance?: EntranceRow; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const create = useAction(createEntrance, { success: "Entrance added" });
  const update = useAction(updateEntrance, { success: "Entrance updated" });
  const pending = create.pending || update.pending;

  async function onSubmit(form: FormData) {
    const values = {
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? "") || null,
    };
    const ok = entrance ? await update.execute({ id: entrance.id, ...values }) : await create.execute({ eventId, ...values });
    if (ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form action={onSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{entrance ? "Edit entrance" : "New entrance"}</DialogTitle>
            <DialogDescription>Guests are redirected using this name, so use what&apos;s on the signage.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="entrance-name">Name</FieldLabel>
              <Input id="entrance-name" name="name" required defaultValue={entrance?.name} placeholder="North Gate" />
            </Field>
            <Field>
              <FieldLabel htmlFor="entrance-description">Directions (optional)</FieldLabel>
              <Textarea
                id="entrance-description"
                name="description"
                rows={2}
                defaultValue={entrance?.description ?? ""}
                placeholder="Past the main car park, left of the stage"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2Icon className="animate-spin" />}
              {entrance ? "Save" : "Add entrance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
