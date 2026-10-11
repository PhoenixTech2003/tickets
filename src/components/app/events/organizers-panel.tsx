"use client";

import { useState } from "react";
import { CrownIcon, Loader2Icon, MailPlusIcon, UserMinusIcon } from "lucide-react";
import { Confirm } from "@/components/app/confirm";
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
import { inviteOrganizer, revokeOrganizer } from "@/server/actions/organizers";
import type { UserHit } from "@/server/actions/users";
import { useOrganizers } from "@/lib/powersync/queries";
import { useSession } from "@/lib/powersync/provider";
import type { OrganizerRow } from "@/lib/powersync/schema";
import { formatRelative, initials } from "@/lib/format";

export function OrganizersPanel({ eventId }: { eventId: string }) {
  const { viewer } = useSession();
  const { data: organizers } = useOrganizers(eventId);
  const isAdmin = viewer.role === "admin";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">
          Organizers manage this event&apos;s entrances, tickets and scanners.
          {isAdmin ? " Invite anyone who has signed in, by email." : " Only admins can invite or revoke organizers."}
        </p>
        {isAdmin && <InviteDialog eventId={eventId} existing={organizers.map((o) => o.user_id)} />}
      </div>
      <Card className="rounded-xl py-2">
        <CardContent className="divide-y px-2">
          {organizers.map((organizer) => (
            <OrganizerItem key={organizer.id} organizer={organizer} canRevoke={isAdmin} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizerItem({ organizer, canRevoke }: { organizer: OrganizerRow; canRevoke: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const revoke = useAction(revokeOrganizer, { success: `${organizer.user_name}'s access revoked` });
  const owner = organizer.is_owner === 1;

  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <Avatar className="size-9">
        <AvatarFallback>{initials(organizer.user_name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate font-medium">
          {organizer.user_name}
          {owner && (
            <Badge variant="outline" className="border-foreground/20 bg-foreground/5">
              <CrownIcon />
              Owner
            </Badge>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {organizer.user_email} · {owner ? "created" : "invited"} {formatRelative(organizer.created_at)}
        </p>
      </div>
      {canRevoke && !owner && (
        <>
          <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} disabled={revoke.pending}>
            <UserMinusIcon data-icon="inline-start" />
            Revoke
          </Button>
          <Confirm
            open={confirm}
            onOpenChange={setConfirm}
            title={`Revoke ${organizer.user_name}?`}
            description="They will lose access to this event immediately."
            confirmLabel="Revoke access"
            onConfirm={() => revoke.execute({ id: organizer.id })}
          />
        </>
      )}
    </div>
  );
}

function InviteDialog({ eventId, existing }: { eventId: string; existing: string[] }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserHit | null>(null);
  const invite = useAction(inviteOrganizer, { success: () => `${user?.name ?? "Organizer"} invited` });

  async function submit() {
    if (user && (await invite.execute({ eventId, userId: user.id }))) {
      setOpen(false);
      setUser(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <MailPlusIcon data-icon="inline-start" />
          Invite organizer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Invite an organizer</DialogTitle>
          <DialogDescription>
            Gives access to this event only. To let them create their own events, make them an organizer under People
            &amp; roles.
          </DialogDescription>
        </DialogHeader>
        <UserPicker field="email" excludeIds={existing} selected={user} onSelect={setUser} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} disabled={!user || invite.pending}>
            {invite.pending && <Loader2Icon className="animate-spin" />}
            {user ? `Invite ${user.email}` : "Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
