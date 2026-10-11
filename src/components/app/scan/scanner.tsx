"use client";

import { useMemo, useRef, useState } from "react";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { useStatus } from "@powersync/react";
import { ScanLineIcon, WifiOffIcon } from "lucide-react";
import { EntranceSelect } from "@/components/app/entrance-select";
import { ScanResult } from "@/components/app/scan/scan-result";
import { SyncProgress } from "@/components/app/sync/sync-progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntrances, useEvents, useMyAssignments, useScans } from "@/lib/powersync/queries";
import { useSession } from "@/lib/powersync/provider";
import { scanCode, type ScanOutcome } from "@/lib/powersync/scan";
import { CODE_LENGTH, isWellFormedCode, normalizeCode } from "@/lib/tickets";
import { formatTime } from "@/lib/format";
import { TONE_BADGE, verdictOf } from "@/lib/verdicts";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "tickets.scan-station";

/** `lockedEntrance`: string = pinned by assignment, null = roaming, undefined = manager's free choice. */
type StationOption = { eventId: string; name: string; lockedEntrance?: string | null };

export function Scanner() {
  const { viewer, db } = useSession();
  const status = useStatus();
  const { data: events, isLoading } = useEvents();
  const { data: assignments } = useMyAssignments();

  const options = useMemo<StationOption[]>(() => {
    const assigned = new Map(assignments.filter((a) => a.disabled === 0).map((a) => [a.eventId, a.entranceId]));
    return events
      .filter((e) => assigned.has(e.id) || viewer.role !== "ticket_scanner")
      .map((e) => ({ eventId: e.id, name: e.name, lockedEntrance: assigned.has(e.id) ? assigned.get(e.id) : undefined }));
  }, [events, assignments, viewer.role]);

  // Restores the last station used on this device.
  const [selection, setSelection] = useState<{ eventId: string | null; entranceId: string | null }>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved?.eventId) return saved;
    } catch {}
    return { eventId: null, entranceId: null };
  });

  const option = options.find((o) => o.eventId === selection.eventId) ?? (options.length === 1 ? options[0] : undefined);
  const eventId = option?.eventId ?? null;
  const entranceId = typeof option?.lockedEntrance === "string" ? option.lockedEntrance : selection.entranceId;

  function choose(next: { eventId: string | null; entranceId: string | null }) {
    setSelection(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  if (isLoading || (!status.hasSynced && options.length === 0)) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-8">
        <SyncProgress />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </main>
    );
  }

  if (options.length === 0) {
    return (
      <main className="grid flex-1 place-items-center p-6">
        <Empty className="max-w-md rounded-xl border border-dashed bg-card p-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScanLineIcon />
            </EmptyMedia>
            <EmptyTitle className="text-lg">No station assigned</EmptyTitle>
            <EmptyDescription>
              When an organizer adds you as a scanner for an event, it shows up here, even without a connection.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-8">
      {!status.connected && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <WifiOffIcon className="size-4 shrink-0" />
          Offline. Scans are verified on this device and sync when the connection returns.
        </div>
      )}

      <StationPicker
        options={options}
        option={option}
        entranceId={entranceId}
        onChange={(next) => choose(next)}
      />

      {eventId && (
        <CodeEntry
          key={`${eventId}:${entranceId}`}
          onScan={(code) => scanCode(db, viewer, { eventId, entranceId }, code)}
          eventId={eventId}
        />
      )}
    </main>
  );
}

function StationPicker({
  options,
  option,
  entranceId,
  onChange,
}: {
  options: StationOption[];
  option?: StationOption;
  entranceId: string | null;
  onChange: (next: { eventId: string | null; entranceId: string | null }) => void;
}) {
  const { data: entrances } = useEntrances(option?.eventId ?? "");
  const pinned = typeof option?.lockedEntrance === "string";

  return (
    <Card className="rounded-xl py-4 shadow-none">
      <CardContent className="grid gap-4 px-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="station-event">
            Event
          </FieldLabel>
          <Select value={option?.eventId ?? ""} onValueChange={(id) => onChange({ eventId: id, entranceId: null })}>
            <SelectTrigger id="station-event" className="w-full">
              <SelectValue placeholder="Choose event" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.eventId} value={o.eventId}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="station-entrance">
            Your entrance {pinned && <Badge variant="outline">Assigned</Badge>}
          </FieldLabel>
          <EntranceSelect
            id="station-entrance"
            className="w-full"
            entrances={entrances}
            value={entranceId}
            disabled={!option || pinned}
            anyLabel="Roaming: any entrance"
            onChange={(id) => option && onChange({ eventId: option.eventId, entranceId: id })}
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function CodeEntry({ eventId, onScan }: { eventId: string; onScan: (code: string) => Promise<ScanOutcome> }) {
  const { viewer } = useSession();
  const [value, setValue] = useState("");
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: scans } = useScans(eventId, 200);
  const mine = scans.filter((s) => s.scanner_id === viewer.id);
  const admittedByMe = mine.filter((s) => s.result === "accepted").length;

  async function submit(code: string) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await onScan(code);
      setOutcome(result);
      navigator.vibrate?.(result.verdict === "accepted" ? 60 : [120, 60, 120]);
    } finally {
      setValue("");
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <Card className="gap-0 rounded-xl py-0 shadow-none">
        <CardContent className="flex flex-col items-center gap-5 px-4 py-8">
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-semibold">Enter ticket code</h1>
            <p className="text-sm text-muted-foreground">Checked as soon as the sixth character is typed.</p>
          </div>
          <InputOTP
            ref={inputRef}
            autoFocus
            maxLength={CODE_LENGTH}
            pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
            value={value}
            disabled={busy}
            inputMode="text"
            autoCapitalize="characters"
            onChange={(v) => setValue(normalizeCode(v))}
            onComplete={(v: string) => {
              const code = normalizeCode(v);
              if (code.length === CODE_LENGTH) void submit(code);
            }}
            containerClassName="gap-2"
          >
            <InputOTPGroup className="gap-2">
              {[0, 1, 2].map((i) => (
                <CodeSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
            <InputOTPSeparator className="text-muted-foreground" />
            <InputOTPGroup className="gap-2">
              {[3, 4, 5].map((i) => (
                <CodeSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {value.length === CODE_LENGTH && !isWellFormedCode(value) && (
            <p className="text-sm text-muted-foreground">Codes always mix letters and numbers.</p>
          )}
        </CardContent>
        <dl className="grid grid-cols-2 border-t text-center">
          <div className="border-r px-4 py-3">
            <dd className="text-2xl font-bold tabular-nums">{admittedByMe}</dd>
            <dt className="text-sm text-muted-foreground">Admitted by you</dt>
          </div>
          <div className="px-4 py-3">
            <dd className="text-2xl font-bold tabular-nums">{mine.length}</dd>
            <dt className="text-sm text-muted-foreground">Your scans</dt>
          </div>
        </dl>
      </Card>

      {outcome && <ScanResult key={outcome.id} outcome={outcome} onDismiss={() => setOutcome(null)} />}

      {mine.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Your recent scans</h2>
          <div className="divide-y rounded-xl border bg-card">
            {mine.slice(0, 8).map((scan) => {
              const verdict = verdictOf(scan.result);
              return (
                <div key={scan.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="ticket-code">{scan.code}</span>
                  <Badge variant="outline" className={cn("ml-auto", TONE_BADGE[verdict.tone])}>
                    {verdict.label}
                  </Badge>
                  <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{formatTime(scan.scanned_at)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

function CodeSlot({ index }: { index: number }) {
  return (
    <InputOTPSlot
      index={index}
      className="h-14 w-11 rounded-lg border bg-background font-mono text-2xl font-semibold first:rounded-lg last:rounded-lg sm:h-16 sm:w-14 sm:text-3xl data-[active=true]:border-primary data-[active=true]:ring-primary/30"
    />
  );
}
