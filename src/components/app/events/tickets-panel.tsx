"use client";

import { useState } from "react";
import { useQueryState } from "nuqs";
import {
  BanIcon,
  DownloadIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  TicketIcon,
  Trash2Icon,
} from "lucide-react";
import { Confirm } from "@/components/app/confirm";
import { EntranceSelect } from "@/components/app/entrance-select";
import { StickyToolbar } from "@/components/app/sticky-toolbar";
import { MoneyInput, parseAmount } from "@/components/app/money-input";
import { useAction } from "@/components/app/use-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteTicketBatch, generateTickets, resetTicket, setTicketVoided } from "@/server/actions/tickets";
import { useBatches, useEntrances, useEvent, useTickets } from "@/lib/powersync/queries";
import { DEFAULT_CURRENCY, formatMoney } from "@/lib/money";
import { searchParser, TICKET_STATUSES, ticketStatusParser } from "@/lib/search-params";
import type { BatchRow, EntranceRow, TicketRow } from "@/lib/powersync/schema";
import { MAX_BATCH } from "@/lib/tickets";
import { formatDate, formatRelative, formatTime } from "@/lib/format";
import { TONE_BADGE } from "@/lib/verdicts";
import { cn } from "@/lib/utils";

const PAGE = 100;

/** Zip of print-ready PDFs (one per batch); the browser downloads it in place. */
function downloadUrl(eventId: string, batchId?: string) {
  const params = new URLSearchParams({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
  if (batchId) params.set("batch", batchId);
  return `/api/events/${eventId}/tickets/download?${params}`;
}

export function TicketsPanel({ eventId }: { eventId: string }) {
  const { data: entrances } = useEntrances(eventId);
  const { data: batches } = useBatches(eventId);
  const { event } = useEvent(eventId);
  const currency = event?.currency ?? DEFAULT_CURRENCY;
  const entranceName = (id: string | null) => entrances.find((e) => e.id === id)?.name ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
      <div className="space-y-4 xl:sticky xl:top-[calc(var(--sticky-offset,0px)+1.5rem)] xl:self-start">
        <GenerateDialog eventId={eventId} entrances={entrances} currency={currency} />
        <Card className="gap-4 rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Print batches</CardTitle>
            <CardDescription>Downloads as a zip of A4 PDFs, ten tickets per page with cut lines. Voided tickets are left out.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {batches.length === 0 && <p className="text-sm text-muted-foreground">No tickets generated yet.</p>}
            {batches.map((batch) => (
              <BatchItem key={batch.id} batch={batch} currency={currency} entranceName={entranceName(batch.entrance_id)} />
            ))}
            {batches.length > 1 && (
              <Button asChild variant="outline" className="mt-2 w-full">
                <a href={downloadUrl(eventId)} download>
                  <DownloadIcon data-icon="inline-start" />
                  Download every batch
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
      <TicketTable eventId={eventId} entranceName={entranceName} />
    </div>
  );
}

function BatchItem({ batch, currency, entranceName }: { batch: BatchRow; currency: string; entranceName: string | null }) {
  const [confirm, setConfirm] = useState(false);
  const remove = useAction(deleteTicketBatch, { success: "Batch deleted" });
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
        <TicketIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {batch.label || `${batch.quantity} tickets`} <span className="text-muted-foreground">· {entranceName ?? "Any entrance"}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {batch.quantity.toLocaleString()}
          {batch.price_minor != null && ` × ${formatMoney(batch.price_minor, currency)}`} · {formatRelative(batch.created_at)}
        </p>
      </div>
      <Button asChild variant="ghost" size="icon-sm" aria-label="Download batch">
        <a href={downloadUrl(batch.event_id, batch.id)} download>
          <DownloadIcon />
        </a>
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Delete batch" onClick={() => setConfirm(true)}>
        <Trash2Icon />
      </Button>
      <Confirm
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this batch?"
        description={`All ${batch.quantity} tickets in it stop working immediately, including printed ones.`}
        onConfirm={() => remove.execute({ id: batch.id })}
      />
    </div>
  );
}

function GenerateDialog({ eventId, entrances, currency }: { eventId: string; entrances: EntranceRow[]; currency: string }) {
  const [open, setOpen] = useState(false);
  const [entranceId, setEntranceId] = useState<string | null>(null);
  const generate = useAction(generateTickets, {
    success: "Tickets generated. Download them from the batch list.",
  });

  async function onSubmit(form: FormData) {
    const ok = await generate.execute({
      eventId,
      entranceId,
      quantity: Number(form.get("quantity")),
      label: String(form.get("label") ?? "") || null,
      price: form.get("price") ? Number(parseAmount(String(form.get("price")))) : null,
    });
    if (ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-11 w-full">
          <PlusIcon data-icon="inline-start" />
          Generate tickets
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={onSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Generate tickets</DialogTitle>
            <DialogDescription>
              Each ticket gets a unique 6-character code mixing letters and numbers, without look-alikes such as O/0
              or I/1.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ticket-entrance">Entrance</FieldLabel>
              <EntranceSelect id="ticket-entrance" entrances={entrances} value={entranceId} onChange={setEntranceId} />
              <FieldDescription>
                {entranceId ? "Only admitted at this entrance; elsewhere guests are redirected." : "Admitted at any entrance."}
              </FieldDescription>
            </Field>
            <div className="grid grid-cols-[8rem_1fr] gap-4">
              <Field>
                <FieldLabel htmlFor="quantity">Quantity</FieldLabel>
                <Input id="quantity" name="quantity" type="number" min={1} max={MAX_BATCH} defaultValue={50} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="label">Label (optional)</FieldLabel>
                <Input id="label" name="label" placeholder="VIP, Early bird…" />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="price">Price per ticket (optional)</FieldLabel>
              <InputGroup>
                <InputGroupAddon>{currency}</InputGroupAddon>
                <MoneyInput id="price" name="price" placeholder="No price" />
              </InputGroup>
              <FieldDescription>Printed on each ticket. Leave it empty to print no price.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={generate.pending}>
              {generate.pending && <Loader2Icon className="animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TicketTable({ eventId, entranceName }: { eventId: string; entranceName: (id: string | null) => string | null }) {
  const [search, setSearch] = useQueryState("q", searchParser);
  const [filter, setFilter] = useQueryState("status", ticketStatusParser);
  const [limit, setLimit] = useState(PAGE);
  const { data: tickets, isLoading } = useTickets(eventId, { search, filter, limit });

  return (
    <Card className="gap-0 rounded-xl pt-0">
      <StickyToolbar className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(TICKET_STATUSES.find((s) => s === v) ?? "all")}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unused">Unused</TabsTrigger>
            <TabsTrigger value="admitted">Admitted</TabsTrigger>
            <TabsTrigger value="voided">Voided</TabsTrigger>
          </TabsList>
        </Tabs>
        <InputGroup className="sm:max-w-56">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => setSearch(e.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 6))}
            placeholder="Find a code"
            className="ticket-code uppercase placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
          />
        </InputGroup>
      </StickyToolbar>
      <CardContent>
        {!isLoading && tickets.length === 0 ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TicketIcon />
              </EmptyMedia>
              <EmptyTitle>No tickets match</EmptyTitle>
              <EmptyDescription>Generate a batch, or change the filter.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Entrance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TicketRowView key={ticket.id} ticket={ticket} entrance={entranceName(ticket.entrance_id)} redeemedAt={entranceName(ticket.redeemed_entrance_id)} />
                ))}
              </TableBody>
            </Table>
            {tickets.length === limit && (
              <Button variant="ghost" className="mt-3 w-full" onClick={() => setLimit((l) => l + PAGE)}>
                Show more
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TicketRowView({ ticket, entrance, redeemedAt }: { ticket: TicketRow; entrance: string | null; redeemedAt: string | null }) {
  const voidAction = useAction(setTicketVoided);
  const reset = useAction(resetTicket, { success: "Ticket can be scanned again" });
  const voided = ticket.voided === 1;

  return (
    <TableRow className={cn(voided && "opacity-60")}>
      <TableCell className="ticket-code text-base">{ticket.code}</TableCell>
      <TableCell className="text-muted-foreground">{entrance ?? "Any"}</TableCell>
      <TableCell>
        {voided ? (
          <Badge variant="outline" className={TONE_BADGE.destructive}>
            Voided
          </Badge>
        ) : ticket.redeemed_at ? (
          <Badge variant="outline" className={TONE_BADGE.success}>
            Admitted {formatDate(ticket.redeemed_at) === formatDate(new Date()) ? formatTime(ticket.redeemed_at) : formatDate(ticket.redeemed_at)}
            {redeemedAt && ` · ${redeemedAt}`}
          </Badge>
        ) : (
          <Badge variant="outline">Unused</Badge>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Ticket actions">
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => voidAction.execute({ id: ticket.id, voided: !voided })}>
              <BanIcon />
              {voided ? "Restore ticket" : "Void ticket"}
            </DropdownMenuItem>
            {ticket.redeemed_at && (
              <DropdownMenuItem onSelect={() => reset.execute({ id: ticket.id })}>
                <RotateCcwIcon />
                Undo admission
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
